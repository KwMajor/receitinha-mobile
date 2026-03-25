export const handleFirebaseError = (code: string): string => {
  switch (code) {
    case 'auth/invalid-email':
      return 'O endereço de e-mail é inválido.';
    case 'auth/user-disabled':
      return 'Este usuário foi desativado.';
    case 'auth/user-not-found':
      return 'Não há usuário correspondente a este e-mail.';
    case 'auth/wrong-password':
      return 'A senha está incorreta.';
    case 'auth/email-already-in-use':
      return 'O endereço de e-mail já está sendo usado por outra conta.';
    case 'auth/weak-password':
      return 'A senha deve ter pelo menos 6 caracteres.';
    case 'auth/network-request-failed':
      return 'Falha na conexão de rede. Verifique sua internet.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas de login malsucedidas. Tente novamente mais tarde.';
    default:
      return 'Não foi possível completar a ação. Verifique sua conexão e tente novamente.';
  }
};

export const handleSQLiteError = (error: Error | any): string => {
  console.error('SQLite Error:', error);
  return 'Erro ao acessar os dados locais. Tente fechar e reabrir o aplicativo.';
};
