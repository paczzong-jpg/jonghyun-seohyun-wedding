import { weddingData } from "@/data/weddingData";

interface AccountSectionProps {
  onCopyAccount: (text: string) => void;
}

export function AccountSection({ onCopyAccount }: AccountSectionProps) {
  return (
    <section className="w-full bg-[var(--color-pink2)] text-[var(--color-text)] pt-15 pb-5">
      <img
        className="block mx-auto mb-3 max-w-[90%]"
        src={weddingData.images.accountTitle}
        alt="마음 전하실 곳"
      />
      <div className="h-3" />

      <ul className="list-none px-5 mb-5">
        <h6 className="font-bold border-b border-[var(--color-text)] pb-1 mb-2 text-16 leading-loose">
          {weddingData.accounts.groom.title}
        </h6>
        {weddingData.accounts.groom.list.map((account, index) => (
          <li
            key={index}
            className="flex items-center justify-between py-1.5 text-15"
          >
            <span className="flex flex-col gap-1">
              <p
                id={`acct-${index}`}
                className="m-0 leading-normal"
              >
                {account.bank} {account.number}
              </p>
              <p className="m-0 leading-normal">{account.name}</p>
            </span>
            <button
              className="bg-[var(--color-text)] text-white border-none rounded-full text-13 px-5 py-2 cursor-pointer whitespace-nowrap shrink-0"
              onClick={() =>
                onCopyAccount(`${account.bank} ${account.number}`)
              }
            >
              복사하기
            </button>
          </li>
        ))}
      </ul>

      <ul className="list-none px-5 mb-5">
        <h6 className="font-bold border-b border-[var(--color-text)] pb-1 mb-2 text-16 leading-loose">
          {weddingData.accounts.bride.title}
        </h6>
        {weddingData.accounts.bride.list.map((account, index) => (
          <li
            key={index}
            className="flex items-center justify-between py-1.5 text-15"
          >
            <span className="flex flex-col gap-1">
              <p
                id={`acct-${index + 3}`}
                className="m-0 leading-normal"
              >
                {account.bank} {account.number}
              </p>
              <p className="m-0 leading-normal">{account.name}</p>
            </span>
            <button
              className="bg-[var(--color-text)] text-white border-none rounded-full text-13 px-5 py-2 cursor-pointer whitespace-nowrap shrink-0"
              onClick={() =>
                onCopyAccount(`${account.bank} ${account.number}`)
              }
            >
              복사하기
            </button>
          </li>
        ))}
      </ul>

      <div className="h-8" />
    </section>
  );
}
