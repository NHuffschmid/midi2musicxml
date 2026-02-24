/**
 * Generates MusicXML direction element for tempo marking.
 */
export function renderDirection(tempo: number | undefined): string {
    if (tempo === undefined) {
        return '';
    }

    return `  <direction placement="above">
    <direction-type>
      <metronome>
        <beat-unit>quarter</beat-unit>
        <per-minute>${tempo}</per-minute>
      </metronome>
    </direction-type>
  </direction>`;
}
