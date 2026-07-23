const menuButton=document.querySelector('[data-mobile-menu]');
const mobileNav=document.querySelector('[data-mobile-nav]');
if(menuButton&&mobileNav){menuButton.addEventListener('click',()=>mobileNav.classList.toggle('open'));document.addEventListener('click',event=>{if(!event.target.closest('[data-mobile-menu]')&&!event.target.closest('[data-mobile-nav]'))mobileNav.classList.remove('open')})}
