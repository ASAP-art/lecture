import { useEffect, useState } from 'react';
import { resolveStageVisual, type ArtAssetMetadata } from '../engine/visuals';
import type { RuntimeGameState } from '../engine/state';
import { resolveStageIllustration, upcomingIllustrationUrl } from '../engine/illustrations';

function ArtImage({ asset, url, layer }: {
  asset: ArtAssetMetadata; url: string; layer: 'background' | 'portrait' | 'illustration';
}) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  if (status === 'failed') return null;
  return <img
    className={`stage-art-${layer}`}
    src={url}
    alt={status === 'ready' ? asset.alt : ''}
    style={{ objectFit: asset.fit, objectPosition: asset.position, visibility: status === 'ready' ? 'visible' : 'hidden' }}
    onLoad={() => setStatus('ready')}
    onError={() => setStatus('failed')}
    draggable={false}
  />;
}

export function StageArt({ state }: { state: RuntimeGameState }) {
  const visual = resolveStageVisual(state, import.meta.env.BASE_URL);
  const illustration = resolveStageIllustration(state, import.meta.env.BASE_URL);
  const upcomingUrl = upcomingIllustrationUrl(state, import.meta.env.BASE_URL);
  useEffect(() => {
    if (!upcomingUrl) return;
    const image = new Image();
    image.decoding = 'async';
    image.src = upcomingUrl;
  }, [upcomingUrl]);
  // A scene change unmounts old requests. Their late events cannot affect new layers.
  const identity = `${state.runId}:${visual.sceneId}`;
  const caption = illustration ? illustration.caption : visual.backgroundCaption;
  return <>
    <section className="stage-art" aria-label="장면 그림">
    <span className="stage-art-fallback" aria-hidden="true">장면 그림</span>
    {illustration ? <ArtImage
      key={`${identity}:illustration:${illustration.url}`}
      asset={illustration.asset} url={illustration.url} layer="illustration"
    /> : <>
    {visual.background.asset && visual.backgroundUrl && <ArtImage
      key={`${identity}:background:${visual.backgroundUrl}`}
      asset={visual.background.asset} url={visual.backgroundUrl} layer="background"
    />}
    {visual.portrait.asset && visual.portraitUrl && <ArtImage
      key={`${identity}:portrait:${visual.portraitUrl}`}
      asset={visual.portrait.asset} url={visual.portraitUrl} layer="portrait"
    />}
    </>}
    </section>
    {caption && <p className="stage-art-caption">{caption}</p>}
  </>;
}
