import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../shared/context/AuthContext';
import useProfileData from '../hooks/useProfileData';
import useAvatarUpload from '../hooks/useAvatarUpload';
import useProfileForm from '../hooks/useProfileForm';
import usePasswordChange from '../hooks/usePasswordChange';
import { fullName } from '../../../shared/utils/format';
import { apiFetch } from '../../../shared/services/api';
import TgNavbar from '../../../shared/layout/TgNavbar';
import MiniFooter from '../../../shared/layout/MiniFooter';
import ProfileHeader from '../components/ProfileHeader';
import BookingManager from '../components/BookingManager';
import PersonalDetailsForm from '../components/PersonalDetailsForm';
import PasswordForm from '../components/PasswordForm';
import ReviewsAboutMe from '../components/ReviewsAboutMe';
import TrustMeter from '../components/TrustMeter';
import ActivityStats from '../components/ActivityStats';
import EditItemModal from '../../items/components/EditItemModal';
import ReviewModal from '../../booking/components/ReviewModal';
import ConfirmDialog from '../../../shared/ui/ConfirmDialog';
import './ProfilePage.css';

export default function ProfilePage() {
  const { user, token, updateUser } = useAuth();

  const data = useProfileData(token);
  const avatar = useAvatarUpload(user, token, updateUser);
  const profile = useProfileForm(user, token, updateUser);
  const password = usePasswordChange();
  const [tab, setTab] = useState(() => {
    const t = new URLSearchParams(window.location.search).get('tab');
    return t === 'rentals' || t === 'items' || t === 'incoming' ? t : 'rentals';
  });
  const [reviewing, setReviewing] = useState(null);
  const [editingItem, setEditingItem] = useState(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const reviewId = searchParams.get('review');
  const reviewAs = searchParams.get('as');
  const { rentals, incoming, loading } = data;

  useEffect(() => {
    if (!reviewId || loading) return;
    let alive = true;

    const open = async () => {
      const inRentals = rentals.find(b => String(b.id) === String(reviewId));
      const inIncoming = incoming.find(b => String(b.id) === String(reviewId));
      let booking = inRentals || inIncoming;
      let role = reviewAs === 'renter' || reviewAs === 'owner'
        ? reviewAs
        : (inRentals ? 'renter' : inIncoming ? 'owner' : null);

      if (!booking) {
        try {
          const { booking: fetched } = await apiFetch(`/bookings/${reviewId}`, {}, token);
          booking = fetched;
          if (!role) role = String(fetched?.renter?.id) === String(user?.id) ? 'renter' : 'owner';
        } catch { }
      }

      if (!alive) return;
      if (booking) setReviewing({ booking, role: role || 'renter' });
      setSearchParams({}, { replace: true });
    };

    open();
    return () => { alive = false; };
  }, [reviewId, reviewAs, loading, rentals, incoming, setSearchParams, token, user?.id]);

  if (!user) return null;

  const name = fullName(profile.form) || user.name || 'הפרופיל שלי';
  const initial = (profile.form.firstName || user.name || '?').trim()[0];
  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })
    : null;
  const rating = Number(user.averageRenterRating) || 0;
  const reviewCount = Number(user.totalRenterReviews) || 0;

  return (
    <div className="tg tg-profile" dir="rtl">
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

            <div className="prof-main">
              <BookingManager
                tab={tab}
                setTab={setTab}
                rentals={data.rentals}
                myItems={data.myItems}
                incoming={data.incoming}
                counts={data.counts}
                hasMore={data.hasMore}
                loadMore={data.loadMore}
                moreBusy={data.moreBusy}
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

            <aside className="prof-side">
              <TrustMeter user={user} rating={rating} reviewCount={reviewCount} />
              <ActivityStats
                itemCount={data.counts.items}
                rentalCount={data.counts.rentals}
                incomingCount={data.counts.incoming}
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
