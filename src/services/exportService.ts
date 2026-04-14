import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import { Share, Linking, Alert } from 'react-native';
import { ShoppingList, ShoppingItem } from '../types';

// ── Helpers ────────────────────────────────────────────────────────────────────

const CATEGORY_ORDER = [
  'Hortifruti', 'Carnes e Peixes', 'Laticínios', 'Padaria',
  'Mercearia', 'Bebidas', 'Temperos', 'Outros',
];

function groupByCategory(items: ShoppingItem[]): { category: string; items: ShoppingItem[] }[] {
  const map = new Map<string, ShoppingItem[]>();
  for (const item of items) {
    const cat = item.category || 'Outros';
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(item);
  }

  const result: { category: string; items: ShoppingItem[] }[] = [];
  for (const cat of CATEGORY_ORDER) {
    if (map.has(cat)) {
      result.push({ category: cat, items: map.get(cat)! });
      map.delete(cat);
    }
  }
  for (const [cat, its] of map) {
    result.push({ category: cat, items: its });
  }
  return result;
}

function formatDate(d = new Date()): string {
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}


function itemQty(item: ShoppingItem): string {
  if (item.quantity != null && item.unit) return `${item.quantity} ${item.unit}`;
  if (item.quantity != null) return String(item.quantity);
  if (item.unit) return item.unit;
  return '';
}

// ── HTML template ─────────────────────────────────────────────────────────────

export function generateShoppingListHTML(list: ShoppingList, items: ShoppingItem[]): string {
  const groups = groupByCategory(items);
  const date = formatDate();
  const total = items.length;
  const checked = items.filter((i) => i.isChecked).length;

  const groupsHTML = groups.map(({ category, items: its }) => {
    const rowsHTML = its.map((item) => {
      const qty = itemQty(item);
      const checked = item.isChecked;
      return `
        <tr style="opacity:${checked ? '0.5' : '1'}">
          <td style="width:20px;padding:7px 6px 7px 0;vertical-align:top;">
            <span style="font-size:15px;">${checked ? '☑' : '☐'}</span>
          </td>
          <td style="padding:7px 0;vertical-align:top;">
            <span style="font-size:14px;${checked ? 'text-decoration:line-through;color:#888;' : 'color:#222;'}">${escapeHTML(item.name)}</span>
            ${qty ? `<span style="font-size:12px;color:#999;margin-left:6px;">${escapeHTML(qty)}</span>` : ''}
          </td>
        </tr>`;
    }).join('');

    return `
      <div style="margin-bottom:20px;">
        <div style="
          font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;
          color:#555;border-bottom:2px solid #ddd;padding-bottom:5px;margin-bottom:2px;
        ">${escapeHTML(category)}</div>
        <table style="width:100%;border-collapse:collapse;">
          <tbody>${rowsHTML}</tbody>
        </table>
      </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; color: #222; background: #fff; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div style="max-width:600px;margin:0 auto;padding:24px 20px;">
    <h1 style="font-size:22px;font-weight:700;color:#111;margin-bottom:4px;">
      ${escapeHTML(list.name)}
    </h1>
    <p style="font-size:13px;color:#777;margin-bottom:6px;">Gerada em ${date}</p>
    <p style="font-size:13px;color:#555;margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid #eee;">
      ${checked} de ${total} ${total === 1 ? 'item marcado' : 'itens marcados'}
    </p>

    ${groupsHTML}

    <div style="
      margin-top:32px;padding-top:12px;border-top:1px solid #eee;
      font-size:11px;color:#aaa;text-align:center;
    ">
      Gerado pelo <strong>RECEITINHA</strong> em ${date}
    </div>
  </div>
</body>
</html>`;
}

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Texto simples ─────────────────────────────────────────────────────────────

export function generatePlainText(list: ShoppingList, items: ShoppingItem[]): string {
  const groups = groupByCategory(items);
  const date = formatDate();

  const lines: string[] = [
    `=== LISTA: ${list.name} ===`,
    `Gerada em ${date}`,
    '',
  ];

  for (const { category, items: its } of groups) {
    lines.push(category.toUpperCase());
    for (const item of its) {
      const qty = itemQty(item);
      const mark = item.isChecked ? '[x]' : '[ ]';
      lines.push(`${mark} ${qty ? qty + ' ' : ''}${item.name}`);
    }
    lines.push('');
  }

  lines.push(`---`);
  lines.push(`Gerado pelo RECEITINHA em ${date}`);
  return lines.join('\n');
}

// ── Texto compacto para WhatsApp ──────────────────────────────────────────────

export function generateWhatsAppText(list: ShoppingList, items: ShoppingItem[]): string {
  const groups = groupByCategory(items);
  const pendingGroups = groups
    .map((g) => ({ ...g, items: g.items.filter((i) => !i.isChecked) }))
    .filter((g) => g.items.length > 0);

  const lines: string[] = [`🛒 *${list.name}*`, ''];

  for (const { category, items: its } of pendingGroups) {
    lines.push(`*${category}*`);
    for (const item of its) {
      const qty = itemQty(item);
      lines.push(`• ${qty ? qty + ' ' : ''}${item.name}`);
    }
    lines.push('');
  }

  lines.push('_Gerado pelo Receitinha_');
  return lines.join('\n');
}

// ── Exportações públicas ───────────────────────────────────────────────────────

export async function exportAsPDF(list: ShoppingList, items: ShoppingItem[]): Promise<void> {
  const html = generateShoppingListHTML(list, items);
  const { uri } = await Print.printToFileAsync({ html, base64: false });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Compartilhar ${list.name}`,
      UTI: 'com.adobe.pdf',
    });
  } else {
    Alert.alert('PDF gerado', 'Não foi possível abrir o compartilhamento neste dispositivo.');
  }
}

export async function exportAsText(list: ShoppingList, items: ShoppingItem[]): Promise<void> {
  const text = generatePlainText(list, items);
  await Share.share({ message: text, title: list.name });
}

export async function exportAsWhatsApp(list: ShoppingList, items: ShoppingItem[]): Promise<void> {
  const text = generateWhatsAppText(list, items);
  const encoded = encodeURIComponent(text);
  const url = `whatsapp://send?text=${encoded}`;

  const canOpen = await Linking.canOpenURL(url);
  if (canOpen) {
    await Linking.openURL(url);
  } else {
    // WhatsApp não instalado — copia para área de transferência
    await Clipboard.setStringAsync(text);
    Alert.alert(
      'WhatsApp não encontrado',
      'O texto da lista foi copiado para a área de transferência. Cole onde quiser!'
    );
  }
}
