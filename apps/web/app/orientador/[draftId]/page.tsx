import { CounselorReview } from '../../../components/counselor/CounselorReview';

export default async function CounselorDraftPage({ params }: { params: Promise<{ draftId: string }> }) {
  const { draftId } = await params;
  return (
    <main className="mx-auto w-full max-w-3xl p-4">
      <CounselorReview draftId={draftId} />
    </main>
  );
}
