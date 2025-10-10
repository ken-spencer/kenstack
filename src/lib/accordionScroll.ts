export default function AccordionScroll(item) {
  if (!item) {
    return;
  }

  if (item.dataset.state === "open") {
    return;
  }

  let openNode;
  for (let p = item; p; p = p.previousSibling) {
    if (p.dataset.state === "open") {
      openNode = p;
      break;
    }
  }

  if (!openNode) {
    return;
  }

  const height = openNode.querySelector(".accordion-content").offsetHeight;
  const rect = item.getBoundingClientRect();
  if (rect.top - height < 0) {
    window.scrollBy({
      top: -height,
      // behavior: 'smooth',
    });
  }
}
