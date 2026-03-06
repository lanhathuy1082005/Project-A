import { Scanner } from '@yudiel/react-qr-scanner';

export default function History() {

  return (
    <Scanner
      onScan={(result) => console.log(result)}
      onError={(error) => console.log(error?.message)}
    />
  );
}