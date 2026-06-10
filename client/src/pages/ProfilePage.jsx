import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useFullBleed } from '../hooks/useFullBleed';
import { useProfileData } from '../hooks/useProfileData';
import { useAvatarUpload } from '../hooks/useAvatarUpload';
import { useProfileForm } from '../hooks/useProfileForm';
import { usePasswordChange } from '../hooks/usePasswordChange';
import { fullName } from '../utils/format';
import TgNavbar from '../components/layout/TgNavbar';
import MiniFooter from '../components/layout/MiniFooter';
import ProfileHeader from '../components/profile/ProfileHeader';
import BookingManager from '../components/profile/BookingManager';
import PersonalDetailsForm from '../components/profile/PersonalDetailsForm';
import PasswordForm from '../components/profile/PasswordForm';
import ReviewsAboutMe from '../components/profile/ReviewsAboutMe';
import TrustMeter from '../components/profile/TrustMeter';
import ActivityStats from '../components/profile/ActivityStats';
import EditItemModal from '../components/item/EditItemModal';
import ReviewModal from '../components/booking/ReviewModal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import './ProfilePage.css';

/* ── Profile / personal area ──────────────────────────────────────────────
   The single "האזור האישי" for the app: the ביחד profile design (header, trust
   meter, activity stats, editable details) plus the full interactive manager
   from the old dashboard (rentals / own items / incoming requests, booking
   actions, two-way reviews, password change).

   This page is now an orchestrator: the data + actions live in hooks
   (useProfileData / useAvatarUpload / useProfileForm / usePasswordChange) and
   each section is its own component under components/profile/. The page only
   wires them together and owns the cross-cutting bits — the active tab, the
   open modal, and the email deep-link. */
export default function ProfilePage() {
  const { user, token, updateUser } = useAuth();
  useFullBleed();

  const data = useProfileData(token);
  const avatar = useAvatarUpload(user, token, updateUser);
  const profile = useProfileForm(user, token, updateUser);
  const password = usePasswordChange(token);

  // Deep links (/profile?tab=incoming|rentals|items) open the matching manager
  // tab directly. Read once from the URL in the initializer instead of syncing
  // via an effect.
  const [tab, setTab] = useState(() => {
    const t = new URLSearchParams(window.location.search).get('tab');
    return t === 'rentals' || t === 'items' || t === 'incoming' ? t : 'rentals';
  });
  const [reviewing, setReviewing] = useState(null); // { booking, role }
  const [editingItem, setEditingItem] = useState(null); // item being edited, or null

  /* Deep link from the "rate this loan" email
     (/profile?review=<bookingId>&as=renter|owner). The `as` side is set by the
     email so each recipient opens the right form: a renter rates the ITEM, an
     owner rates the RENTER. We look the booking up in the matching list only —
     never guess — so the wrong form can't open. The param is then stripped so
     it doesn't re-open on the next render. */
  const [searchParams, setSearchParams] = useSearchParams();
  const reviewId = searchParams.get('review');
  const reviewAs = searchParams.get('as');
  const { rentals, incoming, loading } = data;

  // Reacts to the deep-link param once the booking lists have loaded: open the
  // correct review modal, then strip the param. This legitimately sets state in
  // response to fetched data arriving, so the rule is intentionally disabled.
  useEffect(() => {
    if (!reviewId || loading) return;
    // pick the role from the explicit `as`; fall back to detecting the side for
    // legacy links that don't carry it.
    const role = reviewAs === 'renter' || reviewAs === 'owner'
      ? reviewAs
      : (rentals.some(b => String(b.id) === String(reviewId)) ? 'renter' : 'owner');
    const list = role === 'renter' ? rentals : incoming;
    const match = list.find(b => String(b.id) === String(reviewId));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (match) setReviewing({ booking: match, role });
    setSearchParams({}, { replace: true });
  }, [reviewId, reviewAs, loading, rentals, incoming, setSearchParams]);

  if (!user) return null;

  const name = fullName(profile.form) || user.name || 'הפרופיל שלי';
  const initial = (profile.form.firstName || user.name || '?').trim()[0];
  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })
    : null;
  const rating = Number(user.averageRenterRating) || 0;
  const reviewCount = Number(user.totalRenterReviews) || 0;

  return (
    <div className="tg" dir="rtl">
      <TgNavbar variant="page" active="profile" />

      <main className="profile">
        <div className="wrap">

          <ProfileHeader
            name={name}
            initial={initial}
            memberSince={memberSince}
            area={profile.form.area}
            email={user.email}
            avatar={avatar}
          />

          <div className="prof-grid">

            {/* ── main column ── */}
            <div className="prof-main">
              <BookingManager
                tab={tab}
                setTab={setTab}
                rentals={data.rentals}
                myItems={data.myItems}
                incoming={data.incoming}
                loading={data.loading}
                listErr={data.listErr}
                load={data.load}
                busyId={data.busyId}
                handleAction={data.handleAction}
                itemStatus={data.itemStatus}
                onReview={setReviewing}
                onEdit={setEditingItem}
                onDelete={(item) => { data.setDeleteErr(''); data.setDeletingItem(item); }}
              />

              <PersonalDetailsForm
                form={profile.form}
                field={profile.field}
                editing={profile.editing}
                msg={profile.msg}
                err={profile.err}
                saving={profile.saving}
                toggleEdit={profile.toggleEdit}
                email={user.email}
              />

              <PasswordForm {...password} />

              <ReviewsAboutMe rating={rating} reviewCount={reviewCount} initial={initial} />
            </div>

            {/* ── side column ── */}
            <aside className="prof-side">
              <TrustMeter user={user} rating={rating} reviewCount={reviewCount} />
              <ActivityStats
                itemCount={data.myItems.length}
                rentalCount={data.rentals.length}
                incomingCount={data.incoming.length}
                rating={rating}
                reviewCount={reviewCount}
              />
            </aside>

          </div>
        </div>
      </main>

      {reviewing && (
        <ReviewModal
          booking={reviewing.booking}
          role={reviewing.role}
          onClose={() => setReviewing(null)}
          onSubmitted={data.load}
        />
      )}

      {editingItem && (
        <EditItemModal
          item={editingItem}
          token={token}
          onClose={() => setEditingItem(null)}
          /* patch the edited item in place so the list updates without a refetch */
          onSaved={(updated) => data.setMyItems(items => items.map(it => (it.id === updated.id ? updated : it)))}
        />
      )}

      {data.deletingItem && (
        <ConfirmDialog
          danger
          title="מחיקת פריט"
          message={`להסיר את "${data.deletingItem.title}"? לא ניתן לבטל את הפעולה.`}
          confirmLabel="מחיקה"
          busyLabel="מוחק…"
          cancelLabel="ביטול"
          busy={data.deleteBusy}
          error={data.deleteErr}
          onConfirm={data.confirmDelete}
          onCancel={() => { if (!data.deleteBusy) { data.setDeletingItem(null); data.setDeleteErr(''); } }}
        />
      )}

      <MiniFooter />
    </div>
  );
}
