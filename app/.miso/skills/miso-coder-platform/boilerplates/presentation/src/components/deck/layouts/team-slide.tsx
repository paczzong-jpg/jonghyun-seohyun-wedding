import type { TeamSlide } from "@/lib/deck/types";

function initials(name: string): string {
  return name.trim().slice(0, 2);
}

export function TeamSlideView({ slide }: { slide: TeamSlide }) {
  const count = slide.people.length;
  const cols = count <= 3 ? count : count === 4 ? 4 : Math.ceil(count / 2);

  return (
    <div className="absolute inset-0 flex flex-col px-[88px] pt-[84px] pb-[88px]">
      <header style={{ maxWidth: 860 }}>
        {slide.kicker && <div className="deck-kicker">{slide.kicker}</div>}
        <h2 className="deck-slide-title mt-[14px] whitespace-pre-line">{slide.title}</h2>
      </header>
      <div
        className="mt-[40px] grid flex-1 content-center gap-[28px]"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {slide.people.map((person) => (
          <div key={person.name} className="flex flex-col items-center text-center">
            {person.photo ? (
              <img
                src={person.photo}
                alt={person.name}
                className="h-[108px] w-[108px] rounded-full object-cover"
                style={{ border: "3px solid var(--deck-line)" }}
              />
            ) : (
              <div
                className="grid h-[108px] w-[108px] place-items-center rounded-full text-[30px] font-extrabold"
                style={{
                  background: "var(--deck-accent-soft)",
                  color: "var(--deck-accent)",
                  border: "3px solid var(--deck-line)",
                }}
              >
                {initials(person.name)}
              </div>
            )}
            <div className="mt-[18px] text-[18px] font-extrabold" style={{ color: "var(--deck-ink)" }}>
              {person.name}
            </div>
            <div className="deck-caption mt-[4px]" style={{ fontSize: 13.5 }}>
              {person.role}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
