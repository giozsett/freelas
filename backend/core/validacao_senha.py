import re


def validar_forca_senha(senha):
    """Valida a força de uma senha, retornando o primeiro erro encontrado ou None.

    Requisitos: mínimo 8 caracteres, ao menos 1 letra maiúscula,
    1 número e 1 caractere especial.
    """
    if not senha or len(senha) < 8:
        return 'A senha deve ter no mínimo 8 caracteres.'
    if not re.search(r'[A-Z]', senha):
        return 'A senha deve conter pelo menos uma letra maiúscula.'
    if not re.search(r'[0-9]', senha):
        return 'A senha deve conter pelo menos um número.'
    if not re.search(r'[^A-Za-z0-9]', senha):
        return 'A senha deve conter pelo menos um caractere especial (@, #, $, etc.).'
    return None