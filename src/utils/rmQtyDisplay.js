/**
 * Format one RM detail line: "Oil — 50 Tora (2000 Kg)"
 * Pack qty uses entered_qty + pack UOM; base uses quantity + base UOM.
 */
export function formatRmDetailLine(detail) {
  if (!detail) return "";
  const name = detail.rm_name || detail.product_name || detail.name || "Unknown";
  const baseQty = Math.abs(Number(detail.quantity) || 0);
  const packQty = detail.entered_qty != null
    ? Math.abs(Number(detail.entered_qty))
    : baseQty;
  const packUom = detail.pack_uom_name || detail.uom_name || detail.uom?.name || "";
  const baseUom = detail.base_uom_name || packUom;

  const packPart = packUom
    ? `${packQty.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${packUom}`
    : `${packQty.toLocaleString(undefined, { maximumFractionDigits: 4 })}`;
  const basePart = baseUom
    ? `${baseQty.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${baseUom}`
    : `${baseQty.toLocaleString(undefined, { maximumFractionDigits: 4 })}`;

  // Same UOM / no conversion: show once
  if (!packUom || packUom === baseUom || packQty === baseQty) {
    return `${name} — ${basePart}`;
  }
  return `${name} — ${packPart} (${basePart})`;
}

export function formatRmDetailsList(details = [], max = 3) {
  if (!Array.isArray(details) || details.length === 0) return "-";
  const lines = details.slice(0, max).map(formatRmDetailLine).filter(Boolean);
  const more = details.length > max ? ` +${details.length - max} more` : "";
  return lines.join("; ") + more;
}
