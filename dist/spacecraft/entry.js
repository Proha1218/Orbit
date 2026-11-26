let opening = false;

document.addEventListener('click', async event => {
 const button = event.target.closest('[data-spacecraft]');
 if (!button || opening) return;
 opening = true;
 const caption = button.querySelector('small');
 const label = caption.dataset.originalLabel ??= caption.textContent;
 caption.textContent = 'Открываем раздел…';
 try {
  const {openSpacecraft} = await import('./spacecraft.js');
  openSpacecraft(button.dataset.spacecraft, button);
  caption.textContent = label;
 } catch (error) {
  console.error('Не удалось открыть раздел космической техники', error);
  caption.textContent = 'Ошибка загрузки · повторить';
 } finally {
  opening = false;
 }
});
