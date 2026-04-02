type SidePlayersProps = {
  names: string[];
};

export function SidePlayers({ names }: SidePlayersProps) {
  if (names.length === 0) {
    return <span className="side-player">Pendiente</span>;
  }

  return (
    <div className="side-list">
      {names.map((name) => (
        <span key={name} className="side-player">
          {name}
        </span>
      ))}
    </div>
  );
}
