(() => {
  'use strict';

  const button = document.querySelector('#share-website');
  const dialog = document.querySelector('#share-dialog');
  button.addEventListener('click', () => dialog.showModal());
  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });
})();
