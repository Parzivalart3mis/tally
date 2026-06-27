import { requireUserId } from '@/lib/auth';
import { listPeople, listPresets } from '@/lib/queries';
import { PeopleManager } from '@/components/people/people-manager';

export const metadata = { title: 'People' };

export default async function PeoplePage() {
  const userId = await requireUserId();
  const [people, presets] = await Promise.all([
    listPeople(userId),
    listPresets(userId),
  ]);

  return (
    <PeopleManager
      initialPeople={people.map((p) => ({
        id: p.id,
        name: p.name,
        color: p.color,
        note: p.note,
      }))}
      initialPresets={presets.map((p) => ({
        id: p.id,
        name: p.name,
        memberIds: p.memberIds,
      }))}
    />
  );
}
