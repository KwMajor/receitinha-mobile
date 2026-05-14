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
    .replace(/[\u0300-\u036f]/g, '');
}

export function parseCommand(transcript: string): VoiceCommand {
  const t = normalize(transcript);

  if (/proximo|avancar|continuar|proxima etapa|proxima/.test(t)) return 'NEXT';
  if (/anterior|voltar|passo anterior/.test(t)) return 'PREVIOUS';
  if (/repetir|ler novamente|de novo/.test(t)) return 'REPEAT';
  if (/iniciar timer|comecar timer|iniciar cronometro|comecar cronometro/.test(t)) return 'START_TIMER';
  if (/pausar|pause|parar timer/.test(t)) return 'PAUSE_TIMER';
  if (/sair|fechar|encerrar/.test(t)) return 'STOP';
  return 'UNKNOWN';
}
