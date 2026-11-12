import { memo, useEffect, useState } from 'react';
import { ART_ASSETS, resolveStageVisual, type ArtAssetMetadata, type ResolvedPortrait } from '../engine/visuals';
import type { RuntimeGameState } from '../engine/state';
import { resolveStageIllustration, upcomingIllustrationUrl } from '../engine/illustrations';

function ArtImage({ asset, url, layer, hidden = false }: {
  asset: ArtAssetMetadata; url: string; layer: 'background' | 'portrait' | 'illustration'; hidden?: boolean;
}) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  if (status === 'failed') return null;
  return <img
    className={`stage-art-${layer}`}
    data-art-asset={asset.id}
    src={url}
    alt={status === 'ready' && !hidden ? asset.alt : ''}
    aria-hidden={hidden || undefined}
    style={{ objectFit: asset.fit, objectPosition: layer === 'portrait' ? 'center bottom' : asset.position, visibility: status === 'ready' && !hidden ? 'visible' : 'hidden' }}
    onLoad={() => setStatus('ready')}
    onError={() => setStatus('failed')}
    draggable={false}
  />;
}

function PortraitArt({ portrait }: { portrait: ResolvedPortrait }) {
  const poseUrl = portrait.url !== portrait.neutralUrl ? portrait.url : null;
  const [loaded, setLoaded] = useState<{ url: string; status: 'ready' | 'failed' } | null>(null);
  useEffect(() => {
    if (!poseUrl) return;
    let cancelled = false;
    const image = new Image();
    image.decoding = 'async';
    image.src = poseUrl;
    void image.decode().then(
      () => { if (!cancelled) setLoaded({ url: poseUrl, status: 'ready' }); },
      () => { if (!cancelled) setLoaded({ url: poseUrl, status: 'failed' }); },
    );
    return () => { cancelled = true; };
  }, [poseUrl]);
  const status = !poseUrl ? 'neutral' : loaded?.url === poseUrl ? loaded.status : 'loading';
  const ready = status === 'ready';
  return <div className="stage-art-portrait-slot" data-character={portrait.neutralId} data-pose-state={status}>
    {portrait.neutralAsset && portrait.neutralUrl && <ArtImage
      key={portrait.neutralUrl}
      asset={portrait.neutralAsset} url={portrait.neutralUrl} layer="portrait" hidden={ready}
    />}
    {ready && portrait.asset && poseUrl && <img
      className="stage-art-portrait"
      data-art-asset={portrait.asset.id}
      src={poseUrl}
      alt={portrait.asset.alt}
      style={{ objectFit: portrait.asset.fit, objectPosition: 'center bottom' }}
      onError={() => setLoaded({ url: poseUrl, status: 'failed' })}
      draggable={false}
    />}
  </div>;
}

export const StageArt = memo(function StageArt({ state, title = false }: { state: RuntimeGameState; title?: boolean }) {
  const visual = title ? null : resolveStageVisual(state, import.meta.env.BASE_URL);
  const titleAsset = ART_ASSETS.title_main;
  const illustration = title
    ? titleAsset.status === 'received' && titleAsset.publicPath
      ? { asset: titleAsset, url: `${import.meta.env.BASE_URL.replace(/\/$/, '')}${titleAsset.publicPath}`, caption: null }
      : null
    : resolveStageIllustration(state, import.meta.env.BASE_URL);
  const upcomingUrl = title ? null : upcomingIllustrationUrl(state, import.meta.env.BASE_URL);
  useEffect(() => {
    if (!upcomingUrl) return;
    const image = new Image();
    image.decoding = 'async';
    image.src = upcomingUrl;
  }, [upcomingUrl]);
  // A scene change unmounts old requests. Their late events cannot affect new layers.
  const identity = `${state.runId}:${title ? 'title' : state.sceneId}`;
  const caption = illustration ? illustration.caption : visual?.backgroundCaption ?? null;
  return <>
    <section className="stage-art" aria-label="장면 그림">
    <span className="stage-art-fallback" aria-hidden="true">장면 그림</span>
    {illustration ? <ArtImage
      key={`${identity}:illustration:${illustration.url}`}
      asset={illustration.asset} url={illustration.url} layer="illustration"
    /> : <>
    {visual && visual.background.asset && visual.backgroundUrl && <ArtImage
      key={`${identity}:background:${visual.backgroundUrl}`}
      asset={visual.background.asset} url={visual.backgroundUrl} layer="background"
    />}
    {visual && visual.portraits.length > 0 && <div className="stage-art-portraits">
      {visual.portraits.map((portrait) => <PortraitArt
        key={`${identity}:portrait:${portrait.neutralId}`}
        portrait={portrait}
      />)}
    </div>}
    </>}
    </section>
    {caption && <p className="stage-art-caption">{caption}</p>}
  </>;
});
