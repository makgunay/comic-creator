export function paginatePanels<T extends { order: number }>(panels: readonly T[]): T[][] {
  const ordered = [...panels].sort((left, right) => left.order - right.order);
  return Array.from({ length: Math.ceil(ordered.length / 4) }, (_, page) =>
    ordered.slice(page * 4, page * 4 + 4),
  );
}
