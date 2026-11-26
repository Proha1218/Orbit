const mobile = matchMedia('(max-width: 600px), (max-height: 500px) and (pointer: coarse)');
const stage = document.querySelector('#stage');
const tools = document.querySelector('#mobile-tools');
const buttons = [...document.querySelectorAll('[data-mobile-panel]')];
let active = '';
function setPanel(panel, restoreFocus = false) {
 const previous = buttons.find(button => button.dataset.mobilePanel === active);
 active = panel;
 document.body.dataset.mobilePanel = panel;
 for (const button of buttons) button.setAttribute('aria-expanded', String(button.dataset.mobilePanel === panel));
 if (restoreFocus) previous?.focus();
}
function placeTools() {
 const dock = document.querySelector('.quick-tools');
 if (dock) {
  const container = mobile.matches ? tools : stage;
  if (dock.parentElement !== container) container.append(dock);
 }
}
function syncLayout() {
 setPanel('');
 placeTools();
}
for (const button of buttons) {
 button.addEventListener('click', () => {
  const panel = button.dataset.mobilePanel;
  setPanel(active === panel ? '' : panel);
 });
}
document.querySelector('#object-navigation').addEventListener('click', event => {
 if (mobile.matches && event.target.closest('button:not([data-object-tab])')) setPanel('', true);
});
document.querySelector('#details').addEventListener('click', event => {
 if (mobile.matches && event.target.closest('.moon-row, #start-earth, #back-planet, [data-belt-view]')) setPanel('', true);
});
stage.addEventListener('pointerdown', event => {
 if (mobile.matches && active && event.target.closest('#canvas-host')) setPanel('');
});
document.addEventListener('keydown', event => {
 if (event.key === 'Escape' && mobile.matches && active) {
  event.stopImmediatePropagation();
  setPanel('', true);
 }
}, true);
new MutationObserver(placeTools).observe(stage, {childList:true});
mobile.addEventListener('change', syncLayout);
syncLayout();
