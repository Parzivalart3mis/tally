import { requireUserId } from '@/lib/auth';
import { listPeople, listPresets } from '@/lib/queries';
import { SplitFlow } from '@/components/split-flow/split-flow';

export const metadata = { title: 'New bill' };

export default async function NewBillPage() {
  const userId = await requireUserId();
  const [people, presets] = await Promise.all([
    listPeople(userId),
    listPresets(userId),
  ]);

  return (
    <SplitFlow
      roster={people.map((p) => ({ id: p.id, name: p.name, color: p.color }))}
      presets={presets.map((p) => ({
        id: p.id,
        name: p.name,
        memberIds: p.memberIds,
      }))}
    />
  );
}
