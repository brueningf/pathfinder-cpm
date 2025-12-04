/**
 * Escapes HTML special characters 
 * @param unsafe The unsafe string to escape
 * @returns The escaped string
 */
export const escapeHtml = (unsafe: string): string => {
    const div = document.createElement('div');
    div.textContent = unsafe;
    return div.innerHTML;
};
