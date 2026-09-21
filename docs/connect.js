// Tooltips remain hoverable; Escape dismisses without moving keyboard focus.
document.querySelectorAll('.illustrated-action').forEach(link => {
  link.addEventListener('keydown', event => {
    if (event.key === 'Escape') link.setAttribute('data-dismissed', '');
  });
  for (const event of ['pointerleave', 'blur']) {
    link.addEventListener(event, () => link.removeAttribute('data-dismissed'));
  }
});
