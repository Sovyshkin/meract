import { useNavigate } from "react-router-dom";

import styles from "./GuildCard.module.css";
import guild_default from '../../../images/guild_default.png';
import user from '../../../images/user.png';
import iconguild from '../../../images/iconguild.png';
import share from '../../../images/share.png';
export default function GuildCard({ guild }) {
 const navigate = useNavigate();
  console.log(guild, '1!!!!!!@#')
   const id = guild.id; 
   const isLive = guild.status;
   const title = guild.name || 'no name';
   const description = guild.description;
   const acts = guild.actsCount ?? 0; 
   const users = guild.membersCount ?? 0;
   const tags = guild.tags.join(', ');
   let rawImageUrl = guild.logoFileName || guild_default;
   let finalImage;
   let coverurl = guild.coverFileName || guild_default;
  //  if (!rawImageUrl) {
  //    finalImage = default_back;
  //  } else if (rawImageUrl.startsWith('http')) {
  //    finalImage = rawImageUrl;
  //  } else {
  //    finalImage = `https://meract.com${rawImageUrl}`;
  //  }
   finalImage = guild.logoFileName || guild_default;
 
   const cardStyle = {
     backgroundImage: `url(${coverurl})`,
     backgroundSize: "cover",
     backgroundPosition: "center",
     backgroundRepeat: "no-repeat",
   };

  const handleCardClick = () => {
    navigate(`/guilds/${guild.id}`);
  };

  // if (guild.isMock) {
  //     return (
  //       <div className={styles.parent}>
  //         <p className={styles.subtitle}>Popular</p>
  //         <div className={styles.actCard} onClick={handleCardClick} style={cardStyle}>
  //           <div className={styles.infoblock}>
  //             <div className={styles.inner}>
  //               {isLive === 'ONLINE' && (
  //                 <div className={styles.online}> 
  //                   <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org">
  //                     <circle cx="10" cy="10" r="5" fill="white" />
  //                   </svg>
  //                   <p className={styles.live}>Live</p>
  //                 </div>
  //               )}
  //               <h1 className={styles.title}>{title}</h1>
  //               <p className={styles.desc}>{description}</p>
  //             </div>
  //           </div>
  //         </div>
  //       </div>
  //     );
  //   }
  
    return (
      <div className={styles.actCard} style={cardStyle} onClick={handleCardClick}>
        <img src={share} alt="" className={styles.share}/>
        <div className={styles.overlay} />
        <div className={styles.infoblock}>
          <div className={styles.inner}>
            {isLive === 'ONLINE' && (
              <div className={styles.online}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org">
                  <circle cx="10" cy="10" r="5" fill="white" />
                </svg>
                <p className={styles.live}>Live</p>
              </div>
            )}
            <img src={finalImage} alt="" className={styles.avatar}/>
            <h1 className={styles.title}>{title}</h1>
            {description && <p className={styles.descText}>{description}</p>}
            <div className={styles.cont}>
              <p className={styles.desc}>Guild Acts: <span style={{color:'white', fontSize:'18px',}}>{acts}</span></p>
              <div className={styles.usersdiv}>
                <img src={user} alt="" />
                <p className={styles.membersCount}>{users}</p>
              </div>
            </div>
            {tags != '' &&

              <p className={styles.tags}>Tags: {tags}</p>
            }
            
          </div>
        </div>
  
        {/* <div className={styles.stripe}></div>
        <div className={styles.blocks}>
          <p>{act.location}</p>
          <p>{act.distance}</p>
        </div>
        <div className={styles.info}>
          <div className={styles.arrows}>
            <span className={styles.arrow}>
              <img src="/icons/arrowUp.svg" alt="arrow" />
              <h2>{act.upvotes}</h2>
            </span>
            <span className={styles.arrow}>
              <img src="/icons/arrowDown.svg" alt="arrow" />
              <h2>{act.downvotes}</h2>
            </span>
          </div>
          <h4>{act.liveIn}</h4>
        </div> */}
      </div>
    );
}
