import { useEffect, useState } from 'react';
import { ART_ASSETS, resolveStageVisual, type ArtAssetMetadata } from '../engine/visuals';
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
    style={{ objectFit: asset.fit, objectPosition: layer === 'portrait' ? 'center bottom' : asset.position, visibility: status === 'ready' ? 'visible' : 'hidden' }}
    onLoad={() => setStatus('ready')}
    onError={() => setStatus('failed')}
    draggable={false}
  />;
}

export function StageArt({ state, title = false }: { state: RuntimeGameState; title?: boolean }) {
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
      {visual.portraits.map((portrait) => <div
        className="stage-art-portrait-slot"
        key={`${identity}:portrait:${portrait.direction.assetId}:${portrait.url}`}
      >
        {portrait.asset && portrait.url && <ArtImage
          asset={portrait.asset} url={portrait.url} layer="portrait"
        />}
      </div>)}
    </div>}
    </>}
    </section>
    {caption && <p className="stage-art-caption">{caption}</p>}
  </>;
}
