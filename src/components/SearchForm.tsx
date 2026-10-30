type SearchFormProps = {
  defaultValue?: string;
  action?: string;
  autofocus?: boolean;
  size?: "hero" | "compact";
};

export function SearchForm({
  defaultValue = "",
  action = "/plugins",
  autofocus = false,
  size = "hero",
}: SearchFormProps) {
  return (
    <form className={`search-form search-${size}`} action={action} method="get" role="search">
      <label className="sr-only" htmlFor="q">
        Search plugins
      </label>
      <input
        id="q"
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder="Search by name, feature, or problem…"
        autoFocus={autofocus}
        autoComplete="off"
      />
      <button type="submit">Search</button>
    </form>
  );
}
