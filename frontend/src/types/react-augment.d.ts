import 'react';

declare module 'react' {
  // Type parameter name must match React's declaration for merging
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface InputHTMLAttributes<T> {
    webkitdirectory?: string;
    directory?: string;
    mozdirectory?: string;
  }
}
