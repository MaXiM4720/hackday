import { useState } from 'react';

interface Props {
    onSend: (text: string) => void;
    disabled: boolean;
}

export function ChatInput({ onSend, disabled }: Props) {
    const [text, setText] = useState('');

    const submit = () => {
        const trimmed = text.trim();
        if (!trimmed || disabled) {
            return;
        }
        onSend(trimmed);
        setText('');
    };

    return (
        <div className="chat-input-row">
            <input
                className="text-input"
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="Type a message..."
                onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                        submit();
                    }
                }}
                disabled={disabled}
            />
            <button className="primary-button" onClick={submit} disabled={disabled}>
                Send
            </button>
        </div>
    );
}