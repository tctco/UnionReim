import { Button, Input } from "@fluentui/react-components";
import { Search24Regular } from "@fluentui/react-icons";

export type SearchRowProps = {
    value: string;
    onChange: (value: string) => void;
    onSearch: () => void;
    placeholder?: string;
    buttonText?: string;
    className?: string;
    inputClassName?: string;
    disabled?: boolean;
};

export function SearchRow({
    value,
    onChange,
    onSearch,
    placeholder,
    buttonText = "Search",
    className,
    inputClassName,
    disabled,
}: SearchRowProps) {
    return (
        <div className={className}>
            <Input
                className={inputClassName}
                placeholder={placeholder}
                value={value}
                onChange={(_, d) => onChange(d.value)}
                onKeyDown={(e) => e.key === "Enter" && onSearch()}
                contentBefore={<Search24Regular />}
                disabled={disabled}
            />
            <Button onClick={onSearch} disabled={disabled}>{buttonText}</Button>
        </div>
    );
}

export default SearchRow;


