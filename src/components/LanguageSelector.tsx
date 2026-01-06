import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type Language = "cpp" | "python" | "java" | "javascript";

interface LanguageSelectorProps {
  value: Language;
  onChange: (value: Language) => void;
  label: string;
  excludeLanguage?: Language;
}

const LANGUAGES: { value: Language; label: string; icon: string }[] = [
  { value: "cpp", label: "C++", icon: "🔷" },
  { value: "python", label: "Python", icon: "🐍" },
  { value: "java", label: "Java", icon: "☕" },
  { value: "javascript", label: "JavaScript", icon: "🟨" },
];

const LanguageSelector = ({
  value,
  onChange,
  label,
  excludeLanguage,
}: LanguageSelectorProps) => {
  const availableLanguages = LANGUAGES.filter(
    (lang) => lang.value !== excludeLanguage
  );

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-muted-foreground">
        {label}
      </label>
      <Select value={value} onValueChange={(v) => onChange(v as Language)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {availableLanguages.map((lang) => (
            <SelectItem key={lang.value} value={lang.value}>
              <span className="flex items-center gap-2">
                <span>{lang.icon}</span>
                <span>{lang.label}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default LanguageSelector;
