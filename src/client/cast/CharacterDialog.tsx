import { LoaderCircle, Plus, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import type { Character } from '../../library.ts';
import { MAX_PHOTOS_PER_CHARACTER } from '../../shared/scene.ts';
import { signInRequiredFrom } from '../platform.tsx';
import { trpc } from '../trpc.ts';
import { Alert } from '../ui/Alert.tsx';
import { Button } from '../ui/Button.tsx';
import { Dialog } from '../ui/Dialog.tsx';
import { Text } from '../ui/Text.tsx';
import { TextArea } from '../ui/TextArea.tsx';
import { TextInput } from '../ui/TextInput.tsx';
import { ActionTile } from '../ui/ToggleTile.tsx';
import styles from './CharacterDialog.module.css';
import { MutationError } from './MutationError.tsx';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_PHOTO_BYTES = 15 * 1024 * 1024;

type Photo = {
  /** Local id for React keys and updates. */
  id: string;
  /** Storage key once uploaded (or from the saved character). */
  key?: string | undefined;
  previewUrl: string;
  /** Present for photos picked in this dialog, so a failed upload can retry. */
  file?: File | undefined;
  status: 'uploading' | 'done' | 'error';
  error?: unknown;
};

type Mode = 'edit' | 'confirmDelete' | 'confirmDiscard';

export type CharacterDialogProps = {
  /** The character to edit, or null to add a new one. */
  character: Character | null;
  onClose: () => void;
};

let nextLocalId = 0;
const localId = () => `p${++nextLocalId}`;

export function CharacterDialog({ character, onClose }: CharacterDialogProps) {
  const utils = trpc.useUtils();
  const uploadUrl = trpc.castPhotoUpload.useMutation();
  const save = trpc.saveCharacter.useMutation();
  const remove = trpc.deleteCharacter.useMutation();

  const [name, setName] = useState(character?.name ?? '');
  const [description, setDescription] = useState(character?.description ?? '');
  const [photos, setPhotos] = useState<Photo[]>(() =>
    (character?.photoKeys ?? []).map((key) => ({
      id: localId(),
      key,
      previewUrl: `/media/${key}`,
      status: 'done' as const,
    }))
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('edit');
  const fileInput = useRef<HTMLInputElement>(null);
  const objectUrls = useRef<Set<string>>(new Set());

  useEffect(() => {
    const urls = objectUrls.current;
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
    };
  }, []);

  const updatePhoto = (id: string, patch: Partial<Photo>) =>
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const upload = async (id: string, file: File) => {
    updatePhoto(id, { status: 'uploading', error: undefined });
    try {
      const target = await uploadUrl.mutateAsync({
        contentType: file.type,
        size: file.size,
      });
      const res = await fetch(target.url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': target.contentType },
      });
      if (!res.ok) {
        throw new Error(
          `The photo could not be stored (status ${res.status}). Try adding it again.`
        );
      }
      updatePhoto(id, { key: target.key, status: 'done' });
    } catch (error) {
      updatePhoto(id, { status: 'error', error });
    }
  };

  const onFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setNotice(null);
    const room = MAX_PHOTOS_PER_CHARACTER - photos.length;
    const problems: string[] = [];
    const accepted: File[] = [];
    for (const file of Array.from(files)) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        problems.push(
          `${file.name} isn't a supported format. Use a JPEG, PNG or WebP photo.`
        );
      } else if (file.size > MAX_PHOTO_BYTES) {
        problems.push(`${file.name} is over 15 MB. Pick a smaller photo.`);
      } else if (accepted.length >= room) {
        problems.push(
          `Only ${MAX_PHOTOS_PER_CHARACTER} photos fit. ${file.name} was left out.`
        );
      } else {
        accepted.push(file);
      }
    }
    if (problems.length > 0) setNotice(problems.join(' '));
    const added: Photo[] = accepted.map((file) => {
      const previewUrl = URL.createObjectURL(file);
      objectUrls.current.add(previewUrl);
      return { id: localId(), previewUrl, file, status: 'uploading' as const };
    });
    if (added.length === 0) return;
    setPhotos((prev) => [...prev, ...added]);
    for (const photo of added) {
      if (photo.file) void upload(photo.id, photo.file);
    }
  };

  const removePhoto = (id: string) => {
    setNotice(null);
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  const uploading = photos.some((p) => p.status === 'uploading');
  const doneKeys = photos.flatMap((p) =>
    p.status === 'done' && p.key ? [p.key] : []
  );
  const trimmedName = name.trim();

  const dirty = character
    ? trimmedName !== character.name ||
      description.trim() !== character.description ||
      doneKeys.length !== character.photoKeys.length ||
      doneKeys.some((k, i) => k !== character.photoKeys[i]) ||
      photos.some((p) => p.status !== 'done')
    : trimmedName !== '' || description.trim() !== '' || photos.length > 0;

  const canSave =
    trimmedName.length > 0 &&
    doneKeys.length > 0 &&
    !uploading &&
    !remove.isPending;

  const finish = async () => {
    await utils.cast.invalidate();
    onClose();
  };

  const submit = () => {
    if (!canSave || save.isPending) return;
    save.mutate(
      {
        ...(character ? { id: character.id } : {}),
        name: trimmedName,
        description: description.trim(),
        photoKeys: doneKeys,
      },
      { onSuccess: () => void finish() }
    );
  };

  const doDelete = () => {
    if (!character) return;
    remove.mutate({ id: character.id }, { onSuccess: () => void finish() });
  };

  const requestClose = () => {
    if (save.isPending || remove.isPending) return;
    if (dirty) setMode('confirmDiscard');
    else onClose();
  };

  const retryFailedUploads = () => {
    for (const p of photos) {
      if (p.status === 'error' && p.file) void upload(p.id, p.file);
    }
  };

  let footer;
  if (mode === 'confirmDelete' && character) {
    footer = (
      <div className={styles.confirm}>
        <Text size="sm" as="p">
          Delete {character.name}? Their photos are removed too. Scenes already
          made stay in the library.
        </Text>
        <div className={styles.confirmActions}>
          <Button disabled={remove.isPending} onPress={() => setMode('edit')}>
            Cancel
          </Button>
          <Button variant="primary" loading={remove.isPending} onPress={doDelete}>
            Delete Character
          </Button>
        </div>
      </div>
    );
  } else if (mode === 'confirmDiscard') {
    footer = (
      <div className={styles.confirm}>
        <Text size="sm" as="p">
          Discard changes?
        </Text>
        <div className={styles.confirmActions}>
          <Button onPress={() => setMode('edit')}>Keep Editing</Button>
          <Button variant="primary" onPress={onClose}>
            Discard
          </Button>
        </div>
      </div>
    );
  } else {
    footer = (
      <div className={styles.footerRow}>
        {character ? (
          <Button
            variant="ghost"
            disabled={save.isPending}
            onPress={() => setMode('confirmDelete')}
          >
            Delete
          </Button>
        ) : (
          <span />
        )}
        <div className={styles.confirmActions}>
          <Button disabled={save.isPending} onPress={requestClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={save.isPending}
            disabled={!canSave}
            onPress={submit}
          >
            Save Character
          </Button>
        </div>
      </div>
    );
  }

  const erroredPhotos = photos.filter((p) => p.status === 'error');
  const signInPhoto = erroredPhotos.find((p) => signInRequiredFrom(p.error));
  const shownErrors = signInPhoto
    ? [signInPhoto, ...erroredPhotos.filter((p) => !signInRequiredFrom(p.error))]
    : erroredPhotos;

  return (
    <Dialog
      isOpen
      onOpenChange={(open) => {
        if (!open) requestClose();
      }}
      title={character ? `Edit ${character.name}` : 'Add Character'}
      size="md"
      dismissable={!dirty}
      footer={footer}
    >
      <div className={styles.form}>
        <TextInput
          label="Label"
          placeholder="e.g. Female30A, MaleTeenB, DogC, GuideM40A"
          value={name}
          onChange={setName}
          maxLength={40}
          autoFocus
          onPressEnter={submit}
        />
        <TextArea
          label="Look and Personality"
          value={description}
          onChange={setDescription}
          placeholder="e.g. early 30s, curly dark hair, warm easy smile"
          rows={3}
        />

        <div className={styles.photosField}>
          <div className={styles.photosLabel}>Reference Photos</div>
          <ul className={styles.photos}>
            {photos.map((p, i) => (
              <li key={p.id} className={styles.thumb} data-status={p.status}>
                <img src={p.previewUrl} alt={`Reference photo ${i + 1}`} className={styles.thumbImg} />
                {p.status === 'uploading' ? (
                  <span className={styles.overlay} role="status">
                    <LoaderCircle size={20} className={styles.spinner} aria-hidden />
                    <span className={styles.srOnly}>Uploading photo {i + 1}</span>
                  </span>
                ) : null}
                {p.status === 'error' ? (
                  <span className={styles.overlayError}>Upload failed</span>
                ) : null}
                {i === 0 && p.status !== 'error' ? (
                  <span className={styles.mainTag}>Main</span>
                ) : null}
                <span className={styles.remove}>
                  <Button
                    variant="default"
                    size="sm"
                    aria-label={`Remove photo ${i + 1}`}
                    icon={<X size={14} />}
                    onPress={() => removePhoto(p.id)}
                  />
                </span>
              </li>
            ))}
            {photos.length < MAX_PHOTOS_PER_CHARACTER ? (
              <li className={styles.slot}>
                <ActionTile
                  onPress={() => fileInput.current?.click()}
                  className={styles.addSlot}
                  aria-label="Add reference photos"
                >
                  <span className={styles.addInner}>
                    <Plus size={16} aria-hidden />
                    <span>Add Photo</span>
                  </span>
                </ActionTile>
              </li>
            ) : null}
          </ul>
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            hidden
            onChange={(e) => {
              onFiles(e.target.files);
              e.target.value = '';
            }}
          />
          <Text size="sm" tone="secondary" as="p">
            Clear, well-lit photos of the face. The first photo is the main
            likeness.
          </Text>
        </div>

        {notice ? (
          <Alert tone="warning" title="Some Photos Weren't Added">
            {notice}
          </Alert>
        ) : null}
        {shownErrors.map((p) => (
          <MutationError
            key={p.id}
            error={p.error}
            title={`Couldn't Upload ${p.file?.name ?? 'the Photo'}`}
            onRetry={retryFailedUploads}
          />
        ))}
        {save.error ? (
          <MutationError
            error={save.error}
            title="Couldn't Save the Character"
            onRetry={() => {
              if (save.variables) {
                save.mutate(save.variables, { onSuccess: () => void finish() });
              }
            }}
          />
        ) : null}
        {remove.error ? (
          <MutationError
            error={remove.error}
            title="Couldn't Delete the Character"
            onRetry={doDelete}
          />
        ) : null}
      </div>
    </Dialog>
  );
}
