export default function generateUuidv4(): string {
  // https://stackoverflow.com/questions/105034/how-do-i-create-a-guid-uuid
  return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c: any) =>
    (
      c ^
      (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
    ).toString(16)
  );
}
