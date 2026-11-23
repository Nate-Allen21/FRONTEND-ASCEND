import {element,button} from './genesis.js';

function field(form,label,type,value,min){
  const wrap=element('label',label+' ');
  const input=element('input');
  input.type=type;
  if(type==='checkbox')input.checked=value;
  else {input.value=value;input.required=true;if(min!=null)input.min=min;}
  wrap.append(input);form.append(wrap);
  return input;
}
export async function renderAdmin(root,api,current,page=0){
  const data=await api('/cosmetics/admin?page='+page);
  if(!current())return;
  const message=element('p');message.setAttribute('role','status');
  root.replaceChildren(element('h1','Cosméticos'),message);
  function form(title,path,method,fields){
    const form=element('form',null,'genesis-stage');
    form.append(element('h2',title));
    const body=fields(form);
    const save=element('button','Salvar');form.append(save);
    form.onsubmit=async e=>{
      e.preventDefault();save.disabled=true;
      try{
        await api('/cosmetics/admin/'+path,{method,body:JSON.stringify(body())});
        if(current())await renderAdmin(root,api,current,page);
      }catch(error){message.textContent=error.message;}finally{save.disabled=false;}
    };
    root.append(form);
  }
  for(const item of data.items)form(item.name,'items/'+encodeURIComponent(item.id),'PUT',f=>{
    const price=field(f,'Preço em AC','number',item.cost,1), enabled=field(f,'Disponível','checkbox',item.active);
    return ()=>({price:price.valueAsNumber,active:enabled.checked});
  });
  form('Recompensa futura','reward','PUT',f=>{
    const amount=field(f,'AC por recompensa','number',data.reward,0);return ()=>({amount:amount.valueAsNumber});
  });
  if(data.testBalances)form('Ajustar saldo de teste','test-balance','POST',f=>{
    const id=field(f,'ID da conta','number','',1),delta=field(f,'Variação em AC','number',''),reason=field(f,'Motivo','text','');
    return ()=>({userId:id.valueAsNumber,delta:delta.valueAsNumber,reason:reason.value});
  });
  for(const [title,rows] of [['Aquisições',data.purchases],['Transações',data.transactions]]){
    root.append(element('h2',title));
    const list=element('ul');
    for(const row of rows)list.append(element('li','#'+row.user_id+' · '+(row.item_id||row.description)+' · '+(row.type==='EXPENSE'?'−':'')+(row.cost??row.amount)+' AC · '+new Date(row.created_at||row.purchased_at).toLocaleString('pt-BR')));
    root.append(rows.length?list:element('p','Sem registros nesta página.'));
  }
  const go=n=>renderAdmin(root,api,current,n).catch(e=>message.textContent=e.message);
  root.append(button('Anterior',()=>go(page-1),page===0),button('Próxima',()=>go(page+1),Math.max(data.purchases.length,data.transactions.length)<50));
}
