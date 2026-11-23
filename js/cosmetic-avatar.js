// Keep the original portrait and its fallback in place when decorating an existing avatar.
export function applyFrame(host, frame, animated = true) {
  if (!host) return;
  const previous = host.querySelector(':scope > .genesis-overlay');
  if (!frame?.staticAsset) {
    previous?.remove();
    host.classList.remove('genesis-framed');
    return;
  }
  const animation = animated && frame.animatedAsset || '';
  if (previous?.dataset.still === frame.staticAsset && previous.dataset.motion === animation) return;
  previous?.remove();
  host.classList.add('genesis-framed');
  const picture = document.createElement('picture');
  picture.className = 'genesis-overlay';
  picture.dataset.still = frame.staticAsset;
  picture.dataset.motion = animation;
  if (animation) {
    const source = document.createElement('source');
    source.media = '(prefers-reduced-motion: no-preference)';
    source.type = 'image/webp';
    source.srcset = animation;
    picture.append(source);
  }
  const img = document.createElement('img');
  img.alt = '';
  img.onerror = () => { picture.querySelector('source')?.remove(); img.onerror = null; img.src = frame.staticAsset; };
  img.src = frame.staticAsset;
  picture.append(img);
  host.append(picture);
}

export function cosmeticAvatar(src, frame, {size=180, animated=true, shape='circle', className=''}={}) {
  const host = document.createElement('span');
  host.className = 'genesis-avatar ' + className;
  host.style.width = size + 'px';
  const portrait = document.createElement('img');
  portrait.alt = 'Avatar';
  portrait.src = src;
  portrait.style.borderRadius = shape === 'circle' ? '50%' : '0';
  host.append(portrait);
  applyFrame(host,frame,animated);
  return host;
}
