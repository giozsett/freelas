export function checkPasswordStrength(pwd) {
  if (!pwd) return '';
  const hasLetters = /[a-zA-Z]/.test(pwd);
  const hasNumbers = /[0-9]/.test(pwd);
  const hasUppercase = /[A-Z]/.test(pwd);
  const hasSpecial = /[^a-zA-Z0-9]/.test(pwd);
  if (hasUppercase && hasNumbers && hasSpecial) return 'Forte';
  if (hasLetters && hasNumbers) return 'Média';
  return 'Fraca';
}
