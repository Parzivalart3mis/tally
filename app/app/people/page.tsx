import { requireUserId } from '@/lib/auth';
import { listPeople, listPresets, getSelfPersonId } from '@/lib/queries';
import { PeopleManager } from '@/components/people/people-manager';

export const metadata = { title: 'People' };

export default async function PeoplePage() {
  const userId = await requireUserId();
  const [people, presets, selfId] = await Promise.all([
    listPeople(userId),
    listPresets(userId),
    getSelfPersonId(userId),
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
      initialSelfId={selfId}
    />
  );
}
