import { Field, FieldDescription, FieldLabel } from "./ui/field";
import { Input } from "./ui/input";

interface InputFieldProps {
	placeholderText: string;
	labelText: string;
	descriptionText: string;
	changeFn: React.Dispatch<React.SetStateAction<string>>;
	value: string;
}

export default function InputField({
	placeholderText,
	labelText,
	descriptionText,
	changeFn,
	value,
}: InputFieldProps) {
	return (
		<Field>
			<FieldLabel htmlFor="input-field">{labelText}</FieldLabel>
			<Input
				id="input-field"
				type="text"
				placeholder={placeholderText}
				onChange={(e) => changeFn(e.target.value)}
				value={value}
			/>
			<FieldDescription>{descriptionText}</FieldDescription>
		</Field>
	);
}
