"use client";

import {
  CallControls,
  CallParticipantsList,
  CallStatsButton,
  CallingState,
  PaginatedGridLayout,
  SpeakerLayout,
  useCallStateHooks,
  useCall,
} from "@stream-io/video-react-sdk";
import { LayoutList, Users } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { EndCallButton } from "./end-call-button";
import { Loader } from "./loader";

type CallLayoutType = "grid" | "speaker-left" | "speaker-right";

export const MeetingRoom = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showParticipants, setShowParticipants] = useState(false);
  const [layout, setLayout] = useState<CallLayoutType>("speaker-left");
  const [isMobile, setIsMobile] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const [isSharingActive, setIsSharingActive] = useState(false);

  const { useCallCallingState } = useCallStateHooks();
  const call = useCall();
  const callingState = useCallCallingState();
  const isPersonalRoom = !!searchParams.get("personal");

  // ✅ Detect mobile + orientation
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    handleResize();

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, []);

  // ✅ Detect screen sharing
  useEffect(() => {
    if (!call) return;
    const handleTrackStarted = (track: any) => {
      if (track?.source === "screen_share") setIsSharingActive(true);
    };
    const handleTrackStopped = (track: any) => {
      if (track?.source === "screen_share") setIsSharingActive(false);
    };

    call.on("track.started", handleTrackStarted);
    call.on("track.stopped", handleTrackStopped);

    return () => {
      call.off("track.started", handleTrackStarted);
      call.off("track.stopped", handleTrackStopped);
    };
  }, [call]);

  // ✅ Auto fullscreen (mobile + landscape only)
  useEffect(() => {
    const enterFullscreen = async () => {
      if (!document.fullscreenElement && isMobile && isLandscape) {
        try {
          await document.documentElement.requestFullscreen();
        } catch (err) {
          console.warn("Fullscreen request failed:", err);
        }
      }
    };
    const exitFullscreen = async () => {
      if (document.fullscreenElement && (!isMobile || !isLandscape)) {
        try {
          await document.exitFullscreen();
        } catch (err) {
          console.warn("Exit fullscreen failed:", err);
        }
      }
    };
    if (isMobile) {
      if (isLandscape) enterFullscreen();
      else exitFullscreen();
    }
  }, [isMobile, isLandscape]);

  // ✅ Auto rotate shared screen when in portrait
  useEffect(() => {
    const sharedScreen = document.querySelector(".str-video__screen-share");
    if (!sharedScreen) return;

    if (isMobile && !isLandscape && isSharingActive) {
      // Apply rotation for portrait mode
      sharedScreen.classList.add("rotate-screen-share");
    } else {
      // Remove rotation when not sharing or back to normal
      sharedScreen.classList.remove("rotate-screen-share");
    }
  }, [isSharingActive, isMobile, isLandscape]);

  if (callingState !== CallingState.JOINED) return <Loader />;

  const CallLayout = () => {
    // ✅ Mobile layout
    if (isMobile) {
      return (
        <div
          className={`flex flex-col w-full h-full bg-black transition-all duration-300 ${
            isLandscape ? "justify-center items-center" : ""
          }`}
        >
          <div
            className={`flex ${
              isLandscape ? "h-full" : "h-[100%]"
            } w-full justify-center items-center bg-black`}
          >
            <SpeakerLayout participantsBarPosition="bottom" />
          </div>

          {/* Hide participants in landscape */}
          {!isLandscape && (
            <div className="flex h-[0%] w-full bg-[#111] border-t border-gray-800 overflow-x-auto overflow-y-hidden hide-scrollbar">
              <div className="flex flex-nowrap items-center gap-3 p-2 w-max">
                <CallParticipantsList onClose={() => {}} />
              </div>
            </div>
          )}
        </div>
      );
    }

    // ✅ Desktop layout
    switch (layout) {
      case "grid":
        return <PaginatedGridLayout />;
      case "speaker-right":
        return <SpeakerLayout participantsBarPosition="left" />;
      default:
        return <SpeakerLayout participantsBarPosition="right" />;
    }
  };

  return (
    <div className="relative h-screen w-full overflow-hidden pt-4 text-white bg-black">
      <style jsx global>{`
        /* Hide Stream participant header + count on mobile */
        @media (max-width: 768px) {
          .str-video__participant-list-header,
          .str-video__participant-list-count {
            display: none !important;
          }
        }

        /* Hide scrollbars */
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        /* Fullscreen background fix */
        :-webkit-full-screen,
        :-moz-full-screen,
        :-ms-fullscreen,
        :fullscreen {
          background-color: black;
        }

        /* 🔄 Auto rotate shared screen for portrait mobile */
        .rotate-screen-share {
          transform: rotate(90deg) scale(1.1);
          transform-origin: center center;
          transition: all 0.4s ease-in-out;
          width: 100vh !important;
          height: 100vw !important;
          object-fit: contain !important;
        }
      `}</style>

      <div className="relative flex size-full items-center justify-center">
        <div className="flex size-full max-w-[1000px] items-center">
          <CallLayout />
        </div>

        {/* Desktop participants sidebar */}
        <div
          className={cn("ml-2 hidden h-[calc(100vh_-_86px)]", {
            "show-block": showParticipants && !isMobile,
          })}
        >
          {!isMobile && (
            <CallParticipantsList onClose={() => setShowParticipants(false)} />
          )}
        </div>
      </div>

      {/* Bottom controls */}
      {(!isMobile || !isLandscape) && (
        <div className="fixed bottom-0 flex w-full flex-wrap items-center justify-center gap-5 bg-[#0D1117]/80 backdrop-blur-md py-2">
          <CallControls onLeave={() => router.push("/")} />

          <DropdownMenu>
            <div className="flex items-center">
              <DropdownMenuTrigger
                className="cursor-pointer rounded-2xl bg-[#19232D] px-4 py-2 hover:bg-[#4C535B]"
                title="Call layout"
              >
                <LayoutList size={20} className="text-white" />
              </DropdownMenuTrigger>
            </div>
            <DropdownMenuContent className="border-dark-1 bg-dark-1 text-white">
              {["Grid", "Speaker Left", "Speaker Right"].map((item, i) => (
                <div key={item + "-" + i}>
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() =>
                      setLayout(
                        item.toLowerCase().replace(" ", "-") as CallLayoutType
                      )
                    }
                  >
                    {item}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="border-dark-1" />
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <CallStatsButton />

          {!isMobile && (
            <button
              onClick={() => setShowParticipants((prev) => !prev)}
              title="Show participants"
            >
              <div className="cursor-pointer rounded-2xl bg-[#19232D] px-4 py-2 hover:bg-[#4C535B]">
                <Users size={20} className="text-white" />
              </div>
            </button>
          )}

          {!isPersonalRoom && <EndCallButton />}
        </div>
      )}
    </div>
  );
};
