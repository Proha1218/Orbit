(() => {
 const loader = document.querySelector('#loading');
 const status = loader.querySelector('[data-boot-status]');
 const orbit = loader.querySelector('.loader-orbit');
 const buttons = loader.querySelector('[data-boot-actions]');
 const diagnostic = loader.querySelector('textarea');
 let phase, timeout, pending = true;
 const controller = new AbortController();

 function step(text) {
  phase = text;
  status.textContent = text;
  performance.mark('orbita:' + text);
 }
 function fail(message, error) {
  if (!pending && !error) return;
  pending = false;
  clearTimeout(timeout);
  controller.abort();
  loader.hidden = false;
  orbit.hidden = true;
  status.textContent = message;
  buttons.hidden = false;
  diagnostic.value = [message, phase, error?.stack || error?.message,
   'Protocol: ' + location.protocol, navigator.userAgent].filter(Boolean).join('\n');
 }
 buttons.querySelector('[data-retry]').onclick = () => location.reload();
 buttons.querySelector('[data-copy]').onclick = async () => {
  diagnostic.hidden = false;
  diagnostic.select();
  try {
   await navigator.clipboard.writeText(diagnostic.value);
   buttons.querySelector('[data-copy]').textContent = 'Скопировано';
  } catch {
   diagnostic.focus();
  }
 };
 if (location.protocol === 'file:') {
  fail('Распакуйте архив и запустите START.bat из папки ОРБИТЫ.');
  return;
 }
 step('Загружаем модули атласа…');
 timeout = setTimeout(() => fail('Атлас не запустился за 30 секунд. Проверьте локальный сервер.'), 30000);
 import('./app.js').then(async ({start}) => {
  if (!pending) return;
  const canvas = await start({step, signal:controller.signal});
  if (!pending) return;
  pending = false;
  clearTimeout(timeout);
  loader.hidden = true;
  performance.mark('orbita:interactive');
  canvas.addEventListener('webglcontextlost', event => {
   event.preventDefault();
   fail('Графический контекст потерян. Перезапустите атлас.', new Error('webglcontextlost'));
  });
 }).catch(error => {
  if (pending) fail('Не удалось запустить атлас. Проверьте технические сведения.', error);
 });
})();
