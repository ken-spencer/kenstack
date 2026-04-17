export default function AccordionScroll(item: HTMLElement) {
  if (!item) {
    return;
  }

  if (item.dataset.state === "open") {
    return;
  }

  let openNode: HTMLElement | null = null;
  for (
    let p: HTMLElement | null = item;
    p;
    p = p.previousElementSibling as HTMLElement | null
  ) {
    if (p.dataset.state === "open") {
      openNode = p;
      break;
    }
  }

  if (!openNode) {
    return;
  }

  const height =
    openNode?.querySelector<HTMLElement>(".accordion-content")?.offsetHeight ??
    0;
  const rect = item.getBoundingClientRect();
  if (rect.top - height < 0) {
    window.scrollBy({
      top: -height,
      // behavior: 'smooth',
    });
  }
}
