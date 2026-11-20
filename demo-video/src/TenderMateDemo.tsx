import React from "react";
import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import {
  COLORS,
  SCENE_DURATIONS_SEC,
  SCENE_STARTS_SEC,
  secToFrames,
} from "./config";
import { AudioTracks } from "./components/AudioTracks";
import { Scene1Problem } from "./scenes/Scene1Problem";
import { Scene2Solution } from "./scenes/Scene2Solution";
import { Scene3Upload } from "./scenes/Scene3Upload";
import { Scene4Review } from "./scenes/Scene4Review";
import { Scene5Citation } from "./scenes/Scene5Citation";
import { Scene6Resolve } from "./scenes/Scene6Resolve";
import { Scene7Export } from "./scenes/Scene7Export";
import { Scene8Close } from "./scenes/Scene8Close";

export const TenderMateDemo: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.navy,
        translate: "-43.4px 0px"
      }}
    >
      <Sequence
        name="01 Problem"
        from={secToFrames(SCENE_STARTS_SEC.scene1Problem, fps)}
        durationInFrames={secToFrames(SCENE_DURATIONS_SEC.scene1Problem, fps)}
      >
        <Scene1Problem />
      </Sequence>

      <Sequence
        name="02 Solution"
        from={secToFrames(SCENE_STARTS_SEC.scene2Solution, fps)}
        durationInFrames={secToFrames(SCENE_DURATIONS_SEC.scene2Solution, fps)}
      >
        <Scene2Solution />
      </Sequence>

      <Sequence
        name="03 Upload"
        from={secToFrames(SCENE_STARTS_SEC.scene3Upload, fps)}
        durationInFrames={secToFrames(SCENE_DURATIONS_SEC.scene3Upload, fps)}
      >
        <Scene3Upload />
      </Sequence>

      <Sequence
        name="04 Review"
        from={secToFrames(SCENE_STARTS_SEC.scene4Review, fps)}
        durationInFrames={secToFrames(SCENE_DURATIONS_SEC.scene4Review, fps)}
      >
        <Scene4Review />
      </Sequence>

      <Sequence
        name="05 Citation"
        from={secToFrames(SCENE_STARTS_SEC.scene5Citation, fps)}
        durationInFrames={secToFrames(SCENE_DURATIONS_SEC.scene5Citation, fps)}
      >
        <Scene5Citation />
      </Sequence>

      <Sequence
        name="06 Resolve"
        from={secToFrames(SCENE_STARTS_SEC.scene6Resolve, fps)}
        durationInFrames={secToFrames(SCENE_DURATIONS_SEC.scene6Resolve, fps)}
      >
        <Scene6Resolve />
      </Sequence>

      <Sequence
        name="07 Export"
        from={secToFrames(SCENE_STARTS_SEC.scene7Export, fps)}
        durationInFrames={secToFrames(SCENE_DURATIONS_SEC.scene7Export, fps)}
      >
        <Scene7Export />
      </Sequence>

      <Sequence
        name="08 Close"
        from={secToFrames(SCENE_STARTS_SEC.scene8Close, fps)}
        durationInFrames={secToFrames(SCENE_DURATIONS_SEC.scene8Close, fps)}
      >
        <Scene8Close />
      </Sequence>

      <AudioTracks />
    </AbsoluteFill>
  );
};
