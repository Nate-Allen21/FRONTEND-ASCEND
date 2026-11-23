import {cosmeticAvatar} from './cosmetic-avatar.js';
import {renderAdmin} from './genesis-admin.js';
const rarity = {RARE:'Raro', EPIC:'Épico', LEGENDARY:'Lendário'};
export function element(tag,text,cls){
  const el=document.createElement(tag);
  if(text!=null) el.textContent=text;
  if(cls) el.className=cls;
  return el;
}
export function button(label,action,disabled=false){
  const el=element('button',label);
  el.type='button';
  el.onclick=action;
  el.disabled=disabled;
  return el;
}
export function genesisViews({api,token,portrait,commit,navigate}){
  let state, view, filter='Todos', preview, busy=false, generation=0, admin=false;
  const dialog=document.querySelector('#genesis-dialog');
  dialog.addEventListener('close',()=>dialog.replaceChildren());
  function reset(){
    generation++;
    view=null; state=null; preview=null; admin=false; busy=false; filter='Todos';
    dialog.close();
    for(const key of ['market','studio','cosmetics-admin']) document.getElementById('view-'+key).replaceChildren();
  }
  function leave(){view=null; generation++; dialog.close();}
  async function open(name){
    view=name; preview=null;
    const root=document.getElementById('view-'+name);
    const seq=++generation, session=token();
    root.textContent='Carregando…';
    try {
      if(name==='cosmetics-admin'){
        await renderAdmin(root,api,()=>seq===generation && session===token());
        return;
      }
      const [next,rights]=await Promise.all([api('/cosmetics'),api('/cosmetics/capabilities')]);
      if(seq!==generation || session!==token()) return;
      state=next; admin=rights.admin; commit(next); draw();
    } catch(e){if(seq===generation)root.replaceChildren(element('p',e.message),button('Tentar novamente',()=>open(name)));}
  }
  async function change(item,remove=false){
    if(busy)return;
    const session=token();
    busy=true; draw();
    const path=remove?'/equipped/'+encodeURIComponent(item.slot):item.owned?'/equipped':'/purchase';
    try{
      const next=await api('/cosmetics'+path,{method:remove?'DELETE':item.owned?'PUT':'POST',body:remove?undefined:JSON.stringify({itemId:item.id})});
      if(token()!==session)return;
      state=next; commit(next); preview=null; dialog.close();
      draw();
      status(remove?'Moldura removida.':item.owned?'Moldura equipada.':'Compra concluída.');
    }catch(e){if(session===token())status(e.message);}
    finally{if(session===token()){busy=false; document.querySelectorAll('[data-operation]').forEach(el=>el.disabled=el.dataset.operation==='disabled');}}
  }
  function status(message){const el=(dialog.open?dialog:document.querySelector('#view-'+view))?.querySelector('[role=status]');if(el)el.textContent=message;}
  function action(item,remove=false,label){
    const disabled=!remove && (item.equipped || (!item.owned && item.cost>state.coins));
    const el=button(label || (item.equipped?'Equipado':item.owned?'Equipar':'Comprar'),()=>change(item,remove),busy || disabled);
    el.dataset.operation=disabled?'disabled':'enabled';return el;
  }
  function badge(item){return element('span',rarity[item.rarity]||item.rarity,'genesis-rarity '+item.rarity);}
  function info(item){return [badge(item),element('h3',item.name),element('p',item.description),element('strong',item.cost+' AC')];}
  async function history(page=0){
    const session=token();
    dialog.replaceChildren(button('Fechar',()=>dialog.close()),element('h2','Extrato de ASCEND Coins'),feedback());
    dialog.setAttribute('aria-label','Extrato de ASCEND Coins');
    if(!dialog.open)dialog.showModal();
    const list=element('ul');dialog.append(list);
    try{
      const rows=await api('/cosmetics/transactions?page='+page);
      if(!list.isConnected || token()!==session)return;
      for(const r of rows)list.append(element('li',new Date(r.created_at).toLocaleDateString('pt-BR')+' · '+r.description+' · '+(r.type==='EXPENSE'?'−':'+')+r.amount+' AC'));
      if(!rows.length)dialog.append(element('p','Sem transações nesta página.'));
      dialog.append(button('Anterior',()=>history(page-1),page===0),button('Próxima',()=>history(page+1),rows.length<50));
    }catch(e){if(list.isConnected)status(e.message);}
  }
  function feedback(){const el=element('p');el.setAttribute('role','status');return el;}
  function inspect(item){
    dialog.replaceChildren(button('Fechar',()=>dialog.close()),cosmeticAvatar(portrait(),item),...info(item),action(item),feedback());
    dialog.setAttribute('aria-label',item.name);
    dialog.showModal();
  }
  function draw(){
    if(!state || !['studio','market'].includes(view))return;
    const root=document.getElementById('view-'+view), studio=view==='studio';
    const frames=state.items.filter(i=>i.category==='PROFILE_FRAME' && i.staticAsset);
    const equipped=frames.find(i=>i.equipped);
    const header=element('header',null,'genesis-hero');
    header.append(element('span','Coleção Genesis'),element('h1',studio?'ASCEND STUDIO':'ASCEND MARKET'),element('strong',state.coins+' AC'),button(studio?'Abrir Market':'Meu inventário',()=>navigate(studio?'market':'studio')));
    header.append(button('Extrato',()=>history()));
    if(admin)header.append(button('Administrar cosméticos',()=>navigate('cosmetics-admin')));
    root.replaceChildren(header,feedback());
    if(studio){
      const selected=frames.find(i=>i.id===preview)||equipped;
      const stage=element('section',null,'genesis-stage');
      stage.append(cosmeticAvatar(portrait(),selected),element('h2',selected?.name||'Avatar padrão'));
      if(selected){stage.append(badge(selected));if(selected.owned)stage.append(action(selected));else stage.append(button('Ver no Market',()=>inspect(selected)));}
      if(equipped)stage.append(action(equipped,true,'Desequipar'));
      stage.append(button('Restaurar padrão',()=>{preview=null;if(equipped)change(equipped,true);else draw();},busy));
      root.append(stage,element('h2','Meu inventário'));
      const owned=frames.filter(i=>i.owned);
      if(!owned.length)root.append(element('p','Você ainda não adquiriu molduras.'));
      else root.append(grid(owned,true));
      root.append(element('h2','Experimentar molduras'),grid(frames,true));
    }else{
      const filters=element('div',null,'genesis-filters');
      const choices={'Todos':()=>true,'Raros':i=>i.rarity==='RARE','Épicos':i=>i.rarity==='EPIC','Lendários':i=>i.rarity==='LEGENDARY','Adquiridos':i=>i.owned,'Não adquiridos':i=>!i.owned};
      for(const label of Object.keys(choices)){const el=button(label,()=>{filter=label;draw();root.querySelector('[aria-pressed=true]')?.focus();});el.setAttribute('aria-pressed',String(filter===label));filters.append(el);}
      const visible=frames.filter(choices[filter]);root.append(filters,visible.length?grid(visible,false):element('p','Nenhuma moldura neste filtro.'));
    }
  }
  function grid(items,studio){
    const list=element('div',null,'genesis-grid');
    for(const item of items){
      const card=element('article',null,'genesis-card '+item.rarity);
      const img=element('img');img.src=item.previewUrl;img.alt='';img.loading='lazy';img.width=512;img.height=512;
      card.append(img,...info(item));
      if(item.owned)card.append(element('small',item.equipped?'Equipado':'Adquirido'));
      card.append(button(studio?'Experimentar':'Visualizar',()=>{if(studio){preview=item.id;draw();}else inspect(item);}));
      if(!studio)card.append(action(item));
      list.append(card);
    }
    return list;
  }
  return {open,leave,reset};
}
