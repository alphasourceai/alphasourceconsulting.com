type PlaceholderPageProps = {
  title: string;
  description: string;
};

export default function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <section className="admin-card p-8">
      <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-[#A380F6]">
        Planned workflow
      </p>
      <h2 className="mt-3 text-2xl font-black text-[#0A1547]">{title}</h2>
      <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-[#0A1547]/62">
        {description}
      </p>
    </section>
  );
}
