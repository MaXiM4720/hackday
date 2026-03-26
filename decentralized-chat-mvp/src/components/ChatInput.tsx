import { useState } from 'react';
import './ChatInput.css';

interface ChatInputProps {
  disabled: boolean;
  onSend: (text: string) => void;
}

export function ChatInput({ disabled, onSend }: ChatInputProps) {
  const [value, setValue] = useState('');

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) {
      return;
    }

    onSend(trimmed);
    setValue('');
  };

  return (
    <div className="chat-input">
      <input
        value={value}
        disabled={disabled}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            submit();
          }
        }}
        placeholder={disabled ? 'Connection not ready' : 'Type a message'}
      />
      <button type="button" disabled={disabled || !value.trim()} onClick={submit}>
        Send
      </button>
    </div>
  );
}
