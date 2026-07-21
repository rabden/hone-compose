import { cn } from "@/lib/utils";

export function getRounded(index: number, total: number, columns = 3): string {
  const col = index % columns;
  const row = Math.floor(index / columns);
  const totalRows = Math.ceil(total / columns);
  const itemsInLastRow = total - (totalRows - 1) * columns;
  const isFirstRow = row === 0;
  const isLastRow = row === totalRows - 1;
  const isFirstCol = col === 0;
  const isLastCol = col === (isLastRow ? itemsInLastRow - 1 : columns - 1);
  const colHasItemInLastRow = col < itemsInLastRow;
  const isVisualBottom = colHasItemInLastRow
    ? isLastRow
    : row === totalRows - 2;

  return cn(
    isFirstRow && isFirstCol && "rounded-tl-3xl",
    isFirstRow && isLastCol && "rounded-tr-3xl",
    isVisualBottom && isFirstCol && "rounded-bl-3xl",
    isVisualBottom && isLastCol && "rounded-br-3xl",
    !isFirstRow && "rounded-t-md",
    !isVisualBottom && "rounded-b-md",
    !isFirstCol && "rounded-l-md",
    !isLastCol && "rounded-r-md",
  );
}
