// Функція для розбиття повідомлення на шматки заданої максимальної довжини
export function splitMessage(message, maxLength = 4000) {
  const chunks = [];
  for (let i = 0; i < message.length; i += maxLength) {
    chunks.push(message.slice(i, i + maxLength));
  }
  return chunks;
}
