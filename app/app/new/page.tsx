import { requireUserId } from '@/lib/auth';
import { listPeople, listPresets, getSelfPersonId } from '@/lib/queries';
import { SplitFlow } from '@/components/split-flow/split-flow';

export const metadata = { title: 'New bill' };

export default async function NewBillPage() {
  const userId = await requireUserId();
  const [people, presets, selfId] = await Promise.all([
    listPeople(userId),
    listPresets(userId),
    getSelfPersonId(userId),
  ]);
  const selfName = people.find((p) => p.id === selfId)?.name ?? null;

  return (
    <SplitFlow
      roster={people.map((p) => ({ id: p.id, name: p.name, color: p.color }))}
      presets={presets.map((p) => ({
        id: p.id,
        name: p.name,
        memberIds: p.memberIds,
      }))}
      selfName={selfName}
    />
  );
}
