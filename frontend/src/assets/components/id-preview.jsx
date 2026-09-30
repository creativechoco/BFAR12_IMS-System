import { forwardRef } from 'react'
import './id-preview.css'

/* ═══════════════════════════════════════════════════════════════
   BFAR XII ID CARD — 3.4in × 5.3in (portrait)
   Preview: 326 × 509 px (96 dpi)
   ═══════════════════════════════════════════════════════════════ */

// NOTE: assets were swapped before; instructor layout expects the darker/green-heavy art on top
const TOP_RIBBON_IMG = '/ribbon-bottom.png'
const BOTTOM_RIBBON_IMG = '/ribbon-top.png'
const DEFAULT_LOGO_IMG = '/bfar-logo.png'

const W = 326
const H = 509

/* Photo box: exactly 2 × 2 in */
const PHOTO_PX = 192
const PHOTO_SIDE_MARGIN = Math.round((W - PHOTO_PX) / 2)

const PLACEHOLDER_PHOTO =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${PHOTO_PX}" height="${PHOTO_PX}" viewBox="0 0 ${PHOTO_PX} ${PHOTO_PX}">` +
      `<rect width="${PHOTO_PX}" height="${PHOTO_PX}" fill="#e8e8e8"/>` +
      `<circle cx="${PHOTO_PX / 2}" cy="${PHOTO_PX * 0.38}" r="${PHOTO_PX * 0.18}" fill="#b0b0b0"/>` +
      `<ellipse cx="${PHOTO_PX / 2}" cy="${PHOTO_PX * 0.82}" rx="${PHOTO_PX * 0.28}" ry="${PHOTO_PX * 0.22}" fill="#b0b0b0"/>` +
      `<rect x="2" y="2" width="${PHOTO_PX - 4}" height="${PHOTO_PX - 4}" fill="none" stroke="#ccc" stroke-width="1.5" stroke-dasharray="6,3"/>` +
      `<text x="${PHOTO_PX / 2}" y="${PHOTO_PX - 8}" text-anchor="middle" font-size="9" fill="#aaa" font-family="Calibri,sans-serif">2 × 2 photo</text>` +
      `</svg>`,
  )

/* ───────── Ribbons ───────── */
const TopRibbon = () => (
  <img
    src={TOP_RIBBON_IMG}
    alt=""
    crossOrigin="anonymous"
    style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '198.43px',
      height: '85.73px',
      pointerEvents: 'none',
      zIndex: 1,
      objectFit: 'fill',
    }}
  />
)

const BottomRibbon = () => (
  <img
    src={BOTTOM_RIBBON_IMG}
    alt=""
    crossOrigin="anonymous"
    style={{
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: '198.43px',
      height: '85.73px',
      pointerEvents: 'none',
      zIndex: 1,
      objectFit: 'fill',
    }}
  />
)

/* ───────── BFAR Seal (SVG fallback) ───────── */
const BFARSeal = ({ size = 70 }) => (
  <svg width={size} height={size} viewBox="0 0 80 80">
    <circle cx="40" cy="40" r="37" fill="none" stroke="#1a6b2a" strokeWidth="2.5" />
    <circle cx="40" cy="40" r="31" fill="none" stroke="#d4a017" strokeWidth="1.5" />
    <line x1="29" y1="52" x2="24" y2="22" stroke="#1a6b2a" strokeWidth="2" />
    <line x1="34" y1="52" x2="31" y2="19" stroke="#1a6b2a" strokeWidth="2" />
    <line x1="40" y1="52" x2="40" y2="17" stroke="#1a6b2a" strokeWidth="2.5" />
    <line x1="46" y1="52" x2="49" y2="19" stroke="#1a6b2a" strokeWidth="2" />
    <line x1="51" y1="52" x2="56" y2="22" stroke="#1a6b2a" strokeWidth="2" />
    <ellipse cx="38" cy="49" rx="11" ry="5" fill="#1a6b2a" opacity="0.75" />
    <path d="M49,49 L57,44 L57,54 Z" fill="#1a6b2a" opacity="0.75" />
    <text x="40" y="66" textAnchor="middle" fontSize="6" fill="#1a6b2a" fontWeight="bold" fontFamily="sans-serif">
      B F A R
    </text>
    <text x="40" y="31" textAnchor="middle" fontSize="5.5" fill="#d4a017" fontFamily="sans-serif" fontWeight="bold">
      1898
    </text>
  </svg>
)

const Logo = ({ src, size = 70 }) => {
  const imgSrc = src || DEFAULT_LOGO_IMG
  if (!imgSrc) return <BFARSeal size={size} />

  return (
    <div
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <img
        src={imgSrc}
        alt="Logo"
        crossOrigin="anonymous"
        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}
      />
    </div>
  )
}

/* ═════════════════════════════════════════════
   FRONT CARD
   ═════════════════════════════════════════════ */
export const IDCardFront = forwardRef(function IDCardFront({ data = {}, companyLogo }, ref) {
  const firstName = data.first_name || 'FIRSTNAME'
  const middleInit = data.name_initial ? data.name_initial.toUpperCase() + '.' : 'P.'
  const lastName = (data.last_name || 'LASTNAME').toUpperCase()
  const nameLine1 = `${firstName.toUpperCase()} ${middleInit}`
  const idNumber = data.id_number || ''
  const designation = data.position || 'DESIGNATION'
  const signatureSrc = data.signaturePreview || data.signature_url || null

  return (
    <div
      ref={ref}
      className="bfar-id-card bfar-id-front"
      style={{
        width: `${W}px`,
        height: `${H}px`,
        position: 'relative',
        background: '#ffffff',
        overflow: 'hidden',
        flexShrink: 0,
        fontFamily: "'Open Sans',Calibri,'Segoe UI',Arial,sans-serif",
        boxShadow: '0 6px 28px rgba(0,0,0,0.18)',
        borderRadius: '8px',
      }}
    >
      <TopRibbon />
      <BottomRibbon />

      {/* HEADER */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
          padding: '23px 14px 0 14px',
          marginTop: '8px',
          marginLeft: '16px',
        }}
      >
        <div style={{ flexShrink: 0, marginTop: '2px' }}>
          <Logo src={companyLogo} size={70} />
        </div>

        <div style={{ flex: 1, paddingTop: '9px' }}>
          <div style={{ fontSize: '10px', color: '#333', lineHeight: 1, fontFamily: 'Calibri,sans-serif' }}>
            Republic of the Philippines
          </div>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: '#333',
              lineHeight: 1,
              fontFamily: 'Calibri,sans-serif',
            }}
          >
            Department of Agriculture
          </div>
          <div
            style={{
              fontSize: '14px',
              fontWeight: 900,
              color: '#111',
              lineHeight: 0.8,
              fontFamily: 'Calibri,sans-serif',
              marginTop: '2px',
            }}
          >
            BUREAU OF FISHERIES
            <br />
            AND AQUATIC RESOURCES XII
          </div>
          <div
            style={{
              fontSize: '7.5px',
              color: '#444',
              marginTop: '0px',
              fontFamily: 'Calibri,sans-serif',
              lineHeight: 1.1,
            }}
          >
            Prime Regional Government Center, Carpenter Hill, Koronadal City
            <br />
            Tel. No.: (083) 228-1898 | 228-1899
          </div>
        </div>
      </div>

      {/* PHOTO */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          margin: `12px ${PHOTO_SIDE_MARGIN}px 0 ${PHOTO_SIDE_MARGIN}px`,
          width: `${PHOTO_PX}px`,
          height: `${PHOTO_PX}px`,
          border: '2px solid #d4a017',
          borderRadius: '2px',
          overflow: 'hidden',
          background: '#f4f4f4',
          flexShrink: 0,
        }}
      >
        <img
          src={data.photoPreview || PLACEHOLDER_PHOTO}
          alt="Employee 2x2"
          crossOrigin="anonymous"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center top',
            display: 'block',
          }}
        />
      </div>

      {/* ID NUMBER */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          textAlign: 'center',
          marginTop: '9px',
          fontSize: '13px',
          fontWeight: 700,
          color: '#111',
          fontFamily: 'Calibri,sans-serif',
          letterSpacing: '0.05em',
        }}
      >
        {idNumber ? `ID No.: ${idNumber}` : 'ID No.: '}
      </div>

      {/* FULL NAME */}
      <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '0 10px', marginTop: '3px' }}>
        <div
          style={{
            fontSize: '31px',
            fontWeight: 900,
            color: '#1a6b2a',
            lineHeight: 1.1,
            fontFamily: 'Calibri,sans-serif',
            textTransform: 'uppercase',
            letterSpacing: '-0.01em',
          }}
        >
          {nameLine1}
        </div>
        <div
          style={{
            fontSize: '31px',
            fontWeight: 900,
            color: '#1a6b2a',
            lineHeight: 1.1,
            fontFamily: 'Calibri,sans-serif',
            textTransform: 'uppercase',
            letterSpacing: '-0.01em',
          }}
        >
          {lastName}
        </div>
      </div>

      {/* DESIGNATION */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          textAlign: 'center',
          marginTop: '5px',
          fontSize: '12.5px',
          fontWeight: 600,
          color: '#222',
          fontFamily: 'Calibri,sans-serif',
        }}
      >
        {designation}
      </div>

      {/* SIGNATURE */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          margin: '30px 50px 0 50px',
          borderTop: '1.5px solid #333',
          minHeight: '55px',
        }}
      >
        {signatureSrc && (
          <img
            src={signatureSrc}
            alt="Signature"
            style={{
              position: 'absolute',
              top: '-35px',
              left: '50%',
              transform: 'translateX(-50%)',
              maxWidth: '160px',
              maxHeight: '50px',
              objectFit: 'contain',
              pointerEvents: 'none',
            }}
          />
        )}
      </div>
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          textAlign: 'center',
          marginTop: '-46px',
          fontSize: '10px',
          fontStyle: 'italic',
          color: '#444',
          fontFamily: 'Georgia,Calibri,serif',
        }}
      >
        Signature
      </div>
    </div>
  )
})

/* ═════════════════════════════════════════════
   BACK CARD 
   ═════════════════════════════════════════════ */
export const IDCardBack = forwardRef(function IDCardBack({ data = {} }, ref) {
  const Row = ({ label, value }) => (
    <div style={{ display: 'flex', lineHeight: 1.4 }}>
      <span
        style={{
          fontSize: '12.5px',
          fontWeight: 800,
          color: '#111',
          fontFamily: 'Calibri,sans-serif',
          minWidth: '140px',
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: '12.5px',
          color: '#222',
          fontFamily: 'Calibri,sans-serif',
          flex: 1,
          fontWeight: 800,
          minHeight: '13px',
          paddingBottom: '1px',
        }}
      >
        {value || ''}
      </span>
    </div>
  )

  return (
    <div
      ref={ref}
      className="bfar-id-card bfar-id-back"
      style={{
        width: `${W}px`,
        height: `${H}px`,
        position: 'relative',
        background: '#ffffff',
        overflow: 'hidden',
        flexShrink: 0,
        fontFamily: "'Open Sans',Calibri,'Segoe UI',Arial,sans-serif",
        boxShadow: '0 6px 28px rgba(0,0,0,0.18)',
        borderRadius: '8px',
      }}
    >
      <TopRibbon />
      <BottomRibbon />

      {/* HOME ADDRESS */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          padding: '30px 18px 0 18px',
          marginTop: '16px',
          marginLeft: '20px',
        }}
      >
        <div
          style={{
            fontSize: '11.5px',
            fontWeight: 900,
            color: '#1a6b2a',
            letterSpacing: '0.07em',
            fontFamily: 'Calibri,sans-serif',
          }}
        >
          HOME ADDRESS
        </div>
        <div
          style={{
            minHeight: '13px',
            fontSize: '11.5px',
            color: '#222',
            fontFamily: 'Calibri,sans-serif',
            lineHeight: 1.4,
          }}
        >
          {data.home_address || ''}
        </div>
      </div>

      {/* INFO BOX */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          margin: '25px 18px 0 18px',
          border: '1.5px solid #d4a017',
          borderRadius: '2px',
          padding: '10px 12px 8px 12px',
          fontSize: '11.5px', // slightly larger for better legibility
        }}
      >
        <Row label="CONTACT NUMBER:" value={data.contact_number} />
        <Row label="DATE OF BIRTH:" value={data.date_of_birth} />
        <Row label="SSS No.:" value={data.sss_number} />
        <Row label="PHILHEALTH No.:" value={data.philhealth_number} />
        <Row label="PAG-IBIG No.:" value={data.pagibig_number} />
        <Row label="TIN:" value={data.tin_number} />
        <Row label="BLOOD TYPE:" value={data.blood_type} />

        <div
          style={{
            fontSize: '12.5px',
            fontWeight: 900,
            color: '#1a6b2a',
            letterSpacing: '0.04em',
            margin: '6px 0 6px 0',
            fontFamily: 'Calibri,sans-serif',
            textAlign: 'center',
          }}
        >
          PERSON TO CONTACT IN CASE OF EMERGENCY
        </div>
        <div
          style={{
            minHeight: '13px',
            fontSize: '10px',
            color: '#222',
            fontFamily: 'Calibri,sans-serif',
            paddingBottom: '1px',
            textAlign: 'center',
            fontWeight: 700,
          }}
        >
          {data.emergency_name
            ? `${data.emergency_name}${data.emergency_relationship ? ' — ' + data.emergency_relationship : ''}`
            : ''}
        </div>
        <div
          style={{
            minHeight: '13px',
            marginBottom: '1px',
            fontSize: '9.5px',
            color: '#222',
            fontFamily: 'Calibri,sans-serif',
            textAlign: 'center',
          }}
        >
          {data.emergency_contact || ''}
        </div>
        <div
          style={{
            minHeight: '13px',
            marginBottom: '2px',
            fontSize: '10.5px',
            color: '#222',
            fontFamily: 'Calibri,sans-serif',
            paddingBottom: '1px',
            textAlign: 'center',
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
            whiteSpace: 'normal',
          }}
        >
          {data.emergency_address || ''}
        </div>
      </div>

      {/* CERTIFICATION */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          margin: '20px 16px 0 16px',
          textAlign: 'center',
          fontSize: '11.19px',
          color: '#222',
          lineHeight: 1.2,
          fontFamily: 'Calibri,sans-serif',
        }}
      >
        This is to certify that the person whose picture and signature
        <br />
        appear hereof is a bona fide Job Order/Contract of Service of the
        <br />
        <strong style={{ fontSize: '11.2px' }}>Bureau of Fisheries and Aquatic Resources XII</strong>
      </div>

      {/* DIRECTOR */}
      <div style={{ position: 'absolute', bottom: '31px', left: 0, right: 0, zIndex: 2, textAlign: 'center' }}>
        <div style={{ marginBottom: '-24px' }}>
          <img
            src="/Director_signature.png"
            alt="Director signature"
            crossOrigin="anonymous"
            style={{ maxWidth: '140px', maxHeight: '50px', objectFit: 'contain' }}
          />
        </div>
        <div
          style={{
            fontSize: '14px',
            fontWeight: 900,
            color: '#111',
            letterSpacing: '0.03em',
            fontFamily: 'Calibri,sans-serif',
            
          }}
        >
          EUGENE M. CASAS
        </div>
        <div
          style={{
            fontSize: '11px',
            color: '#333',
            fontFamily: 'Calibri,sans-serif',
            marginTop: '1px',
            fontStyle: 'italic',
          }}
        >
          Officer-in-Charge, Regional Director
        </div>
      </div>
    </div>
  )
})
