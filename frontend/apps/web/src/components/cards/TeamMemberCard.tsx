export default function TeamMemberCard({ name, role, initials, bio }: { name: string; role: string; initials: string; bio: string }) {
  return (
    <div className="text-center" aria-label={name}>
      <div className="w-24 h-24 rounded-full bg-golden flex items-center justify-center mx-auto mb-4">
        <span className="text-white text-2xl font-bold">{initials}</span>
      </div>
      <h3 className="font-[family-name:var(--font-display)] text-lg font-bold">{name}</h3>
      <p className="text-caramel text-sm mb-2">{role}</p>
      <p className="text-cocoa text-sm">{bio}</p>
    </div>
  );
}
