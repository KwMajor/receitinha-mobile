export type VoiceCommand =
  | 'NEXT'
  | 'PREVIOUS'
  | 'REPEAT'
  | 'START_TIMER'
  | 'PAUSE_TIMER'
  | 'STOP'
  | 'UNKNOWN';

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // remove acentos
    .replace(/[.,!?;:]/g, ' ')         // remove pontua\u00e7\u00e3o que o Google adiciona
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseCommand(transcript: string): VoiceCommand {
  const t = normalize(transcript);
  if (!t) return 'UNKNOWN';

  // Ordem importa: comandos mais especificos primeiro (timer antes de "pausar" generico)
  if (/\b(iniciar|comecar|liga|ativar|start)\s+(timer|cronometro|tempo)\b/.test(t)) return 'START_TIMER';
  if (/\b(pausar|pause|parar|para)\s+(timer|cronometro|tempo)\b/.test(t)) return 'PAUSE_TIMER';
  if (/\b(pausar|pause|pausa)\b/.test(t)) return 'PAUSE_TIMER';

  // Pr\u00f3ximo (tamb\u00e9m aceita "proxima", "avancar", "continua", "vai", "seguinte")
  if (/\b(pro?xim[oa]|avanc[ae]r?|continu[ae]r?|segue|seguinte|vai|prossegue|prosseguir)\b/.test(t)) return 'NEXT';

  // Anterior (tamb\u00e9m aceita "volta", "voltar", "anterior", "retornar")
  if (/\b(anterior|volt[ae]r?|retorna[r]?|atras)\b/.test(t)) return 'PREVIOUS';

  // Repetir
  if (/\b(repetir?|repete|ler novamente|le novamente|de novo|outra vez|fala de novo)\b/.test(t)) return 'REPEAT';

  // Sair
  if (/\b(sair|fechar|encerrar|terminar|cancelar)\b/.test(t)) return 'STOP';

  return 'UNKNOWN';
}
