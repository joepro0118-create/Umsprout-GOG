import React from "react";
import { Composition, Folder } from "remotion";
import {
  SCENE_DURATIONS_SEC,
  secToFrames,
  TOTAL_DURATION_SEC,
  VIDEO_FPS,
  VIDEO_HEIGHT,
  VIDEO_WIDTH,
} from "./config";
import { TenderMateDemo } from "./TenderMateDemo";
import { Scene1Problem } from "./scenes/Scene1Problem";
import { Scene2Solution } from "./scenes/Scene2Solution";
import { Scene3Upload } from "./scenes/Scene3Upload";
import { Scene4Review } from "./scenes/Scene4Review";
import { Scene5Citation } from "./scenes/Scene5Citation";
import { Scene6Resolve } from "./scenes/Scene6Resolve";
import { Scene7Export } from "./scenes/Scene7Export";
import { Scene8Close } from "./scenes/Scene8Close";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="TenderMateDemo"
        component={TenderMateDemo}
        durationInFrames={secToFrames(TOTAL_DURATION_SEC)}
        fps={VIDEO_FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
      />

      <Folder name="Scenes">
        <Composition
          id="Scene1-Problem"
          component={Scene1Problem}
          durationInFrames={secToFrames(SCENE_DURATIONS_SEC.scene1Problem)}
          fps={VIDEO_FPS}
          width={VIDEO_WIDTH}
          height={VIDEO_HEIGHT}
        />
        <Composition
          id="Scene2-Solution"
          component={Scene2Solution}
          durationInFrames={secToFrames(SCENE_DURATIONS_SEC.scene2Solution)}
          fps={VIDEO_FPS}
          width={VIDEO_WIDTH}
          height={VIDEO_HEIGHT}
        />
        <Composition
          id="Scene3-Upload"
          component={Scene3Upload}
          durationInFrames={secToFrames(SCENE_DURATIONS_SEC.scene3Upload)}
          fps={VIDEO_FPS}
          width={VIDEO_WIDTH}
          height={VIDEO_HEIGHT}
        />
        <Composition
          id="Scene4-Review"
          component={Scene4Review}
          durationInFrames={secToFrames(SCENE_DURATIONS_SEC.scene4Review)}
          fps={VIDEO_FPS}
          width={VIDEO_WIDTH}
          height={VIDEO_HEIGHT}
        />
        <Composition
          id="Scene5-Citation"
          component={Scene5Citation}
          durationInFrames={secToFrames(SCENE_DURATIONS_SEC.scene5Citation)}
          fps={VIDEO_FPS}
          width={VIDEO_WIDTH}
          height={VIDEO_HEIGHT}
        />
        <Composition
          id="Scene6-Resolve"
          component={Scene6Resolve}
          durationInFrames={secToFrames(SCENE_DURATIONS_SEC.scene6Resolve)}
          fps={VIDEO_FPS}
          width={VIDEO_WIDTH}
          height={VIDEO_HEIGHT}
        />
        <Composition
          id="Scene7-Export"
          component={Scene7Export}
          durationInFrames={secToFrames(SCENE_DURATIONS_SEC.scene7Export)}
          fps={VIDEO_FPS}
          width={VIDEO_WIDTH}
          height={VIDEO_HEIGHT}
        />
        <Composition
          id="Scene8-Close"
          component={Scene8Close}
          durationInFrames={secToFrames(SCENE_DURATIONS_SEC.scene8Close)}
          fps={VIDEO_FPS}
          width={VIDEO_WIDTH}
          height={VIDEO_HEIGHT}
        />
      </Folder>
    </>
  );
};
