export function BrandMark({ small = false }: { small?: boolean }) {
  return <div aria-label="Dashbored" className={small ? "grid h-7 w-7 grid-cols-3 gap-[2px] rounded-md bg-foreground p-[5px]" : "grid h-9 w-9 grid-cols-3 gap-[2px] rounded-md bg-foreground p-[7px]"}>
    {[0,1,2,3,4,5,6,7,8].map((cell) => <span key={cell} className={`rounded-[1px] ${[0,4,8].includes(cell) ? "bg-background" : "bg-background/25"}`} />)}
  </div>;
}
