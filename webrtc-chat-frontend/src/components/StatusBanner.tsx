interface Props {
    status: string;
    error?: string | null;
}

export function StatusBanner({ status, error }: Props) {
    return (
        <div className={`status-banner ${error ? 'status-error' : 'status-ok'}`}>
            <strong>Status:</strong> {error ?? status}
        </div>
    );
}